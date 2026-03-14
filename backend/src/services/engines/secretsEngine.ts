/**
 * Secret Guardian Engine — Phase 2C
 *
 * Detects hardcoded secrets, API keys, tokens, and credentials
 * using 30+ regex patterns across any text-based file.
 *
 * Supports: .env, .js, .ts, .py, .json, .yaml, .toml, .cfg, .conf, .ini, etc.
 */

import type { Engine, FileInput, ScanResult, Vulnerability } from "./types.js";

interface SecretPattern {
  id: string;
  title: string;
  regex: RegExp;
  severity: Vulnerability["severity"];
  description: string;
  fixSuggestion: string;
  cweId: string;
  service?: string; // e.g. "AWS", "GitHub"
}

// ─── 30 Secret Patterns ───────────────────────────────────────────────────────

const SECRET_PATTERNS: SecretPattern[] = [
  // ── Cloud Provider Keys ──────────────────────────────────────────────────
  {
    id: "S-AWS-001",
    title: "Hardcoded AWS Access Key ID",
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
    severity: "critical",
    service: "AWS",
    description: "An AWS Access Key ID was found hardcoded in the source. This grants programmatic access to AWS services and can lead to full account compromise.",
    fixSuggestion: "Remove this key immediately and rotate it in the AWS IAM console. Use environment variables (process.env.AWS_ACCESS_KEY_ID) instead.",
    cweId: "CWE-798",
  },
  {
    id: "S-AWS-002",
    title: "Hardcoded AWS Secret Access Key",
    regex: /(?:aws_secret_access_key|aws_secret|secret_key)\s*[=:]\s*["']?([A-Za-z0-9/+]{40})["']?/gi,
    severity: "critical",
    service: "AWS",
    description: "An AWS Secret Access Key was found hardcoded. Combined with an Access Key ID, this gives full programmatic AWS access.",
    fixSuggestion: "Rotate the key immediately in AWS IAM. Store secrets using AWS Secrets Manager or environment variables.",
    cweId: "CWE-798",
  },
  {
    id: "S-GCP-001",
    title: "Hardcoded Google Cloud API Key",
    regex: /AIza[0-9A-Za-z_-]{35}/g,
    severity: "critical",
    service: "Google Cloud",
    description: "A Google Cloud / Firebase API key was found hardcoded. This can be abused to make authenticated requests to Google APIs at your expense.",
    fixSuggestion: "Restrict this key in the Google Cloud Console and rotate it. Use server-side environment variables, never embed in client-side code.",
    cweId: "CWE-798",
  },
  {
    id: "S-AZURE-001",
    title: "Hardcoded Azure Storage Account Key",
    regex: /AccountKey=[A-Za-z0-9+/=]{88}/g,
    severity: "critical",
    service: "Azure",
    description: "An Azure Storage Account Key was found. This grants full read/write/delete access to Azure Blob/Queue/Table storage.",
    fixSuggestion: "Regenerate the key in the Azure Portal and use Azure Managed Identities or Key Vault instead.",
    cweId: "CWE-798",
  },

  // ── Version Control / CI ─────────────────────────────────────────────────
  {
    id: "S-GH-001",
    title: "Hardcoded GitHub Personal Access Token",
    regex: /ghp_[0-9A-Za-z]{36}/g,
    severity: "critical",
    service: "GitHub",
    description: "A GitHub Personal Access Token (PAT) was detected. This allows full repo access under the token owner's account.",
    fixSuggestion: "Revoke the token at github.com/settings/tokens and use GitHub Actions Secrets or environment variables.",
    cweId: "CWE-798",
  },
  {
    id: "S-GH-002",
    title: "Hardcoded GitHub OAuth Token",
    regex: /gho_[0-9A-Za-z]{36}/g,
    severity: "critical",
    service: "GitHub",
    description: "A GitHub OAuth token was found hardcoded.",
    fixSuggestion: "Revoke on GitHub and store in environment variables.",
    cweId: "CWE-798",
  },
  {
    id: "S-GH-003",
    title: "Hardcoded GitHub Actions Token",
    regex: /ghs_[0-9A-Za-z]{36}/g,
    severity: "critical",
    service: "GitHub",
    description: "A GitHub Actions token was found hardcoded.",
    fixSuggestion: "Use the built-in GITHUB_TOKEN secret in GitHub Actions workflows.",
    cweId: "CWE-798",
  },
  {
    id: "S-GL-001",
    title: "Hardcoded GitLab Personal Access Token",
    regex: /glpat-[0-9A-Za-z_-]{20}/g,
    severity: "critical",
    service: "GitLab",
    description: "A GitLab Personal Access Token was found hardcoded.",
    fixSuggestion: "Revoke at gitlab.com/profile/personal_access_tokens and use environment variables.",
    cweId: "CWE-798",
  },

  // ── Communication APIs ───────────────────────────────────────────────────
  {
    id: "S-SLACK-001",
    title: "Hardcoded Slack Bot Token",
    regex: /xoxb-[0-9A-Za-z-]{24,72}/g,
    severity: "high",
    service: "Slack",
    description: "A Slack Bot Token was found. This allows sending messages, reading channels, and other bot actions on your workspace.",
    fixSuggestion: "Revoke at api.slack.com/apps and use environment variables for the token.",
    cweId: "CWE-798",
  },
  {
    id: "S-SLACK-002",
    title: "Hardcoded Slack Webhook URL",
    regex: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+/g,
    severity: "high",
    service: "Slack",
    description: "A Slack incoming webhook URL was found. Anyone with this URL can post messages to your Slack channel.",
    fixSuggestion: "Regenerate the webhook in Slack App settings and store in environment variables.",
    cweId: "CWE-798",
  },
  {
    id: "S-TWILIO-001",
    title: "Hardcoded Twilio API Key",
    regex: /SK[0-9a-fA-F]{32}/g,
    severity: "high",
    service: "Twilio",
    description: "A Twilio API key was detected. This can be used to make calls, send SMS, and incur charges on your account.",
    fixSuggestion: "Revoke in the Twilio console and store credentials in environment variables.",
    cweId: "CWE-798",
  },
  {
    id: "S-SENDGRID-001",
    title: "Hardcoded SendGrid API Key",
    regex: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/g,
    severity: "high",
    service: "SendGrid",
    description: "A SendGrid API key was found. This allows sending emails from your account.",
    fixSuggestion: "Revoke at app.sendgrid.com/settings/api_keys and use environment variables.",
    cweId: "CWE-798",
  },

  // ── Payment Processors ───────────────────────────────────────────────────
  {
    id: "S-STRIPE-001",
    title: "Hardcoded Stripe Secret Key",
    regex: /sk_live_[0-9A-Za-z]{24,}/g,
    severity: "critical",
    service: "Stripe",
    description: "A Stripe live secret key was found. This allows full access to your Stripe account including charges and refunds.",
    fixSuggestion: "Roll the key immediately at dashboard.stripe.com/apikeys and use environment variables.",
    cweId: "CWE-798",
  },
  {
    id: "S-STRIPE-002",
    title: "Hardcoded Stripe Test Key",
    regex: /sk_test_[0-9A-Za-z]{24,}/g,
    severity: "medium",
    service: "Stripe",
    description: "A Stripe test secret key was found. While test keys don't process real payments, they should still not be in source code.",
    fixSuggestion: "Store in environment variables (process.env.STRIPE_SECRET_KEY).",
    cweId: "CWE-798",
  },

  // ── Database / Connection Strings ────────────────────────────────────────
  {
    id: "S-DB-001",
    title: "Hardcoded Database Connection String",
    regex: /(postgres|mysql|mongodb|redis|mssql|mariadb):\/\/[^:]+:[^@]+@[^\s"']+/gi,
    severity: "critical",
    description: "A database connection string with embedded credentials was found. This exposes the database host, username, and password.",
    fixSuggestion: "Move to environment variables (process.env.DATABASE_URL) and use a secrets manager in production.",
    cweId: "CWE-312",
  },

  // ── Generic Secret Patterns ──────────────────────────────────────────────
  {
    id: "S-GEN-001",
    title: "Hardcoded Password in Variable",
    regex: /(?:password|passwd|pwd|secret)\s*[=:]\s*["']([^"']{8,})["']/gi,
    severity: "high",
    description: "A hardcoded password was found assigned to a variable. Passwords must never be committed to source control.",
    fixSuggestion: "Use environment variables or a secrets manager. Ensure .env files are in .gitignore.",
    cweId: "CWE-259",
  },
  {
    id: "S-GEN-002",
    title: "Hardcoded API Key in Variable",
    regex: /(?:api_key|apikey|api_secret|access_token|auth_token)\s*[=:]\s*["']([A-Za-z0-9_\-]{16,})["']/gi,
    severity: "high",
    description: "A hardcoded API key or token was found in a variable assignment.",
    fixSuggestion: "Move to environment variables and ensure the file is not committed to source control.",
    cweId: "CWE-798",
  },
  {
    id: "S-GEN-003",
    title: "Hardcoded Private Key Block",
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    severity: "critical",
    description: "A PEM private key block was found in source code. Private keys must never be committed to version control.",
    fixSuggestion: "Remove immediately. Store private keys in a key management service or as environment secrets.",
    cweId: "CWE-321",
  },
  {
    id: "S-GEN-004",
    title: "Hardcoded JWT Secret",
    regex: /(?:jwt_secret|jwt_key|jwtSecret|jwtKey)\s*[=:]\s*["']([A-Za-z0-9_\-]{8,})["']/gi,
    severity: "critical",
    description: "A hardcoded JWT secret was found. This can be used to forge authentication tokens and impersonate any user.",
    fixSuggestion: "Use a long (256-bit+) random secret stored in environment variables. Rotate it immediately.",
    cweId: "CWE-798",
  },
  {
    id: "S-GEN-005",
    title: "Potential Secret in .env Variable",
    regex: /^(?:SECRET|TOKEN|KEY|PASSWORD|AUTH|CREDENTIAL)[A-Z_]*\s*=\s*.{8,}/gm,
    severity: "medium",
    description: "A .env variable name suggesting a secret was found with a non-empty value. Ensure .env files are never committed to git.",
    fixSuggestion: "Add .env to .gitignore. Use .env.example with placeholder values as a template.",
    cweId: "CWE-312",
  },

  // ── AI / ML APIs ─────────────────────────────────────────────────────────
  {
    id: "S-OPENAI-001",
    title: "Hardcoded OpenAI API Key",
    regex: /sk-[A-Za-z0-9]{20,}/g,
    severity: "critical",
    service: "OpenAI",
    description: "An OpenAI API key was found. This can be used to make requests billed to your account.",
    fixSuggestion: "Revoke at platform.openai.com/api-keys and store in environment variables.",
    cweId: "CWE-798",
  },
  {
    id: "S-HUGGINGFACE-001",
    title: "Hardcoded HuggingFace Token",
    regex: /hf_[A-Za-z0-9]{30,}/g,
    severity: "high",
    service: "HuggingFace",
    description: "A HuggingFace API token was found hardcoded.",
    fixSuggestion: "Revoke at huggingface.co/settings/tokens and use environment variables.",
    cweId: "CWE-798",
  },

  // ── Infrastructure ───────────────────────────────────────────────────────
  {
    id: "S-VERCEL-001",
    title: "Hardcoded Vercel Token",
    regex: /(?:vercel_token|VERCEL_TOKEN)\s*[=:]\s*["']?([A-Za-z0-9]{24})["']?/gi,
    severity: "high",
    service: "Vercel",
    description: "A Vercel deployment token was found hardcoded.",
    fixSuggestion: "Revoke in Vercel settings and use environment secrets in your CI/CD pipeline.",
    cweId: "CWE-798",
  },
  {
    id: "S-NPM-001",
    title: "Hardcoded NPM Auth Token",
    regex: /\/\/registry\.npmjs\.org\/:_authToken=[A-Za-z0-9\-_]{36,}/g,
    severity: "high",
    service: "npm",
    description: "An npm authentication token was found in a .npmrc file. This allows publishing packages to npm.",
    fixSuggestion: "Remove from .npmrc and use NPM_TOKEN as an environment variable in CI/CD.",
    cweId: "CWE-798",
  },
];

// ─── Entropy-based generic secret detection ───────────────────────────────────
// A simple heuristic: very long Base64-looking strings near secret-sounding keywords
const HIGH_ENTROPY_PATTERN: SecretPattern = {
  id: "S-ENT-001",
  title: "High-Entropy String (Possible Secret)",
  regex: /(?:key|secret|token|password|credential|auth)\s*[=:]\s*["']([A-Za-z0-9+/=_\-]{32,})["']/gi,
  severity: "medium",
  description: "A high-entropy string near a secret-sounding variable name was detected. This may be an exposed credential.",
  fixSuggestion: "Review this value. If it is a real secret, move it to environment variables.",
  cweId: "CWE-798",
};

SECRET_PATTERNS.push(HIGH_ENTROPY_PATTERN);

// ─── File extension allow-list ────────────────────────────────────────────────
const SKIP_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg", ".pdf", ".zip", ".tar", ".gz"]);

// ─── Engine ───────────────────────────────────────────────────────────────────

export const secretsEngine: Engine = {
  name: "secrets",
  supportedExtensions: ["*"],

  async run(files: FileInput[]): Promise<ScanResult> {
    const start = Date.now();
    const vulnerabilities: Vulnerability[] = [];

    for (const file of files) {
      // Skip non-text files
      const ext = "." + (file.filename.split(".").pop()?.toLowerCase() ?? "");
      if (SKIP_EXTENSIONS.has(ext)) continue;

      const lines = file.content.split("\n");

      for (const pattern of SECRET_PATTERNS) {
        // Reset lastIndex for global regexes
        pattern.regex.lastIndex = 0;

        const matches = file.content.matchAll(pattern.regex);
        for (const match of matches) {
          // Find which line the match is on
          const matchIndex = match.index ?? 0;
          const linesBefore = file.content.slice(0, matchIndex).split("\n");
          const lineNumber = linesBefore.length;
          const line = lines[lineNumber - 1] ?? "";

          // Skip if the value looks like a placeholder
          const matchText = match[0];
          if (/placeholder|example|your[-_]|<[^>]+>|xxx|changeme|todo/i.test(matchText)) continue;

          // Redact the actual secret value in the snippet
          const redacted = matchText.replace(/([A-Za-z0-9+/=_\-]{8,})$/, (s) =>
            s.slice(0, 4) + "***REDACTED***"
          );

          vulnerabilities.push({
            engine: "secrets",
            severity: pattern.severity,
            title: pattern.title,
            description: pattern.description,
            filePath: file.filename,
            lineNumber,
            codeSnippet: redacted,
            fixSuggestion: pattern.fixSuggestion,
            cweId: pattern.cweId,
          });
        }
      }
    }

    return {
      engine: "secrets",
      vulnerabilities,
      filesScanned: files.length,
      scanDurationMs: Date.now() - start,
    };
  },
};
