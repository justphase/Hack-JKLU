/**
 * GitHub App Auth Routes — Native Repo Selection (like Lovable/Bolt)
 *
 * Uses GitHub App installation flow so users get GitHub's native UI
 * to select exactly which repositories to grant access to.
 *
 * Flow:
 * 1. User clicks "Connect GitHub" → github.com/apps/{slug}/installations/select_target
 * 2. GitHub shows native repo picker (All repos / Only select repos)
 * 3. Callback: installation_id + code → we exchange code for user token
 * 4. We create a JWT → get an installation access token (scoped to selected repos only)
 * 5. /repos endpoint lists only the repos the user selected
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";

const GITHUB_API = "https://api.github.com";

interface CallbackQuery {
  installation_id?: string;
  setup_action?: string;
  code?: string;
}

interface ReposQuery {
  installation_id?: string;
  page?: string;
}

// ── Generate JWT for GitHub App authentication ──────────────────────────────

function createAppJWT(): string {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!appId || !privateKey) {
    throw new Error("GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY not configured");
  }

  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      iat: now - 60,       // Issued 60s ago (clock drift tolerance)
      exp: now + 10 * 60,  // Expires in 10 minutes
      iss: appId,
    },
    privateKey,
    { algorithm: "RS256" }
  );
}

// ── Get installation access token (scoped to selected repos) ────────────────

async function getInstallationToken(installationId: string): Promise<string> {
  const appJWT = createAppJWT();

  const res = await fetch(`${GITHUB_API}/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${appJWT}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to get installation token: ${res.status} ${err}`);
  }

  const data = await res.json() as { token: string };
  return data.token;
}

export async function githubAuthRoutes(server: FastifyInstance) {

  // ─── Step 1: Redirect to GitHub App Install Page ──────────────────────────
  // This is the exact same flow as Lovable/Bolt — GitHub shows the native repo picker
  server.get("/auth/github", async (_request: FastifyRequest, reply: FastifyReply) => {
    const appSlug = process.env.GITHUB_APP_SLUG;
    if (!appSlug) {
      return reply.status(500).send({ error: "GITHUB_APP_SLUG not configured. Create a GitHub App first." });
    }

    // This URL shows GitHub's native "Install & Authorize" page with repo selection
    const state = crypto.randomUUID();
    return reply.redirect(`https://github.com/apps/${appSlug}/installations/select_target?state=${state}`);
  });

  // ─── Step 2: Handle Install/Auth Callback ─────────────────────────────────
  server.get("/auth/github/callback", async (request: FastifyRequest<{ Querystring: CallbackQuery }>, reply: FastifyReply) => {
    const { installation_id, setup_action, code } = request.query;
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    if (!installation_id) {
      return reply.redirect(`${frontendUrl}/dashboard?github_error=no_installation`);
    }

    try {
      // Get user info via OAuth code exchange (if provided)
      let githubUser = "";
      let githubAvatar = "";

      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;

      if (code && clientId && clientSecret) {
        const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
        });
        const tokenData = await tokenRes.json() as { access_token?: string };

        if (tokenData.access_token) {
          const userRes = await fetch(`${GITHUB_API}/user`, {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          });
          const userData = await userRes.json() as { login?: string; avatar_url?: string };
          githubUser = userData.login ?? "";
          githubAvatar = userData.avatar_url ?? "";
        }
      }

      // Verify we can get an installation token (proves the app is installed)
      await getInstallationToken(installation_id);

      const params = new URLSearchParams({
        github_installation_id: installation_id,
        github_user: githubUser,
        github_avatar: githubAvatar,
        github_setup: setup_action || "install",
      });

      return reply.redirect(`${frontendUrl}/dashboard?${params.toString()}`);
    } catch (err) {
      console.error("[GitHub App] Callback error:", err);
      return reply.redirect(`${frontendUrl}/dashboard?github_error=setup_failed`);
    }
  });

  // ─── Step 3: List Installation Repos (ONLY the ones user selected!) ───────
  server.get("/auth/github/repos", async (request: FastifyRequest<{ Querystring: ReposQuery }>, reply: FastifyReply) => {
    const { installation_id, page = "1" } = request.query;

    if (!installation_id) {
      return reply.status(400).send({ error: "installation_id is required" });
    }

    try {
      const installToken = await getInstallationToken(installation_id);

      const res = await fetch(
        `${GITHUB_API}/installation/repositories?page=${page}&per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${installToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!res.ok) {
        return reply.status(res.status).send({ error: "Failed to fetch repos" });
      }

      const data = await res.json() as {
        total_count: number;
        repositories: Array<Record<string, unknown>>;
      };

      return reply.send({
        totalCount: data.total_count,
        repos: data.repositories.map((r) => ({
          fullName: r.full_name as string,
          name: r.name as string,
          isPrivate: r.private as boolean,
          url: r.html_url as string,
          description: r.description as string | null,
          language: r.language as string | null,
          updatedAt: r.updated_at as string,
          defaultBranch: r.default_branch as string,
        })),
      });
    } catch (err) {
      return reply.status(500).send({
        error: "Failed to fetch repos",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // ─── Step 4: Get installation token for scanning ──────────────────────────
  server.post("/auth/github/token", async (request: FastifyRequest<{ Body: { installation_id?: string } }>, reply: FastifyReply) => {
    const { installation_id } = request.body ?? {};
    if (!installation_id) {
      return reply.status(400).send({ error: "installation_id required" });
    }

    try {
      const token = await getInstallationToken(installation_id);
      return reply.send({ token });
    } catch (err) {
      return reply.status(500).send({
        error: "Failed to get token",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // ─── Step 5: Disconnect (uninstall) ───────────────────────────────────────
  server.post("/auth/github/disconnect", async (request: FastifyRequest<{ Body: { installation_id?: string } }>, reply: FastifyReply) => {
    const { installation_id } = request.body ?? {};

    if (installation_id) {
      try {
        const appJWT = createAppJWT();
        await fetch(`${GITHUB_API}/app/installations/${installation_id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${appJWT}`,
            Accept: "application/vnd.github.v3+json",
          },
        });
      } catch { /* best effort */ }
    }

    return reply.send({ success: true });
  });
}
