/**
 * GitHub Repo Downloader — Phase 3
 *
 * Downloads a public GitHub repo as a tarball, extracts it,
 * and returns all scannable files as FileInput[].
 *
 * Uses GitHub's public archive URL — no token needed for public repos.
 */

import { mkdtempSync, rmSync, readFileSync, readdirSync, statSync } from "fs";
import { join, extname, basename } from "path";
import { tmpdir } from "os";
import { pipeline } from "stream/promises";
import { createGunzip } from "zlib";
import { extract } from "tar";
import type { FileInput } from "../engines/types.js";

// ─── Config ───────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 500_000; // 500KB max per file
const MAX_FILES = 200;         // Scan at most 200 files

const SCANNABLE_EXTENSIONS = new Set([
  ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
  ".py", ".pyw",
  ".json", ".yaml", ".yml", ".toml",
  ".env", ".cfg", ".conf", ".ini",
  ".html", ".htm",
  ".sh", ".bash",
  ".sql",
  ".go", ".rs", ".rb", ".php", ".java", ".cs",
]);

const SCANNABLE_FILENAMES = new Set([
  "package.json", "requirements.txt", "Pipfile",
  "openapi.yaml", "openapi.yml", "openapi.json",
  "swagger.yaml", "swagger.yml", "swagger.json",
  ".env", ".env.local", ".env.production",
  "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
]);

const SKIP_DIRS = new Set([
  "node_modules", ".git", "vendor", "dist", "build",
  ".next", "__pycache__", ".venv", "venv",
  ".cache", "coverage", ".nyc_output",
]);

// ─── Parse GitHub URL ─────────────────────────────────────────────────────────

interface RepoInfo {
  owner: string;
  repo: string;
  branch?: string;
}

export function parseGitHubUrl(url: string): RepoInfo {
  // Supports: https://github.com/owner/repo, https://github.com/owner/repo/tree/branch
  const cleaned = url.replace(/\/$/, "").replace(/\.git$/, "");
  const match = cleaned.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/(.+))?/);
  if (!match) throw new Error(`Invalid GitHub URL: ${url}`);
  return {
    owner: match[1],
    repo: match[2],
    branch: match[3] ?? "main",
  };
}

// ─── Walk directory and collect files ─────────────────────────────────────────

function walkDir(dir: string, rootDir: string): FileInput[] {
  const files: FileInput[] = [];

  function recurse(currentDir: string) {
    if (files.length >= MAX_FILES) return;

    let entries;
    try {
      entries = readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (files.length >= MAX_FILES) break;

      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          recurse(join(currentDir, entry.name));
        }
      } else if (entry.isFile()) {
        const filePath = join(currentDir, entry.name);
        const ext = extname(entry.name).toLowerCase();
        const name = basename(entry.name);

        const isScannable = SCANNABLE_EXTENSIONS.has(ext) || SCANNABLE_FILENAMES.has(name);
        if (!isScannable) continue;

        try {
          const stat = statSync(filePath);
          if (stat.size > MAX_FILE_SIZE || stat.size === 0) continue;

          const content = readFileSync(filePath, "utf-8");
          const relativePath = filePath.replace(rootDir, "").replace(/\\/g, "/").replace(/^\//, "");

          files.push({ filename: relativePath, content });
        } catch {
          // Skip unreadable files
        }
      }
    }
  }

  recurse(dir);
  return files;
}

// ─── Download and extract repo ────────────────────────────────────────────────

export async function downloadRepo(repoUrl: string, accessToken?: string): Promise<{ files: FileInput[]; repoInfo: RepoInfo; tempDir: string }> {
  const repoInfo = parseGitHubUrl(repoUrl);

  // Try main branch first, fallback to master
  let tarballUrl = `https://github.com/${repoInfo.owner}/${repoInfo.repo}/archive/refs/heads/${repoInfo.branch}.tar.gz`;

  const tempDir = mkdtempSync(join(tmpdir(), "oracle-scan-"));

  // Auth headers for private repos
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  try {
    let response = await fetch(tarballUrl, { headers });

    // Fallback to master if main doesn't exist
    if (!response.ok && repoInfo.branch === "main") {
      repoInfo.branch = "master";
      tarballUrl = `https://github.com/${repoInfo.owner}/${repoInfo.repo}/archive/refs/heads/master.tar.gz`;
      response = await fetch(tarballUrl, { headers });
    }

    if (!response.ok) {
      throw new Error(`Failed to download repo: ${response.status} ${response.statusText}. ${accessToken ? "Check repo access permissions." : "Is the repo public?"}`);
    }

    // @ts-expect-error — Node.js fetch body is a ReadableStream
    await pipeline(response.body, createGunzip(), extract({ cwd: tempDir }));

    // The tarball extracts to a folder named `repo-branch/`
    const extractedEntries = readdirSync(tempDir);
    const repoDir = extractedEntries.length === 1
      ? join(tempDir, extractedEntries[0])
      : tempDir;

    const files = walkDir(repoDir, repoDir);

    return { files, repoInfo, tempDir };
  } catch (err) {
    // Clean up on error
    try { rmSync(tempDir, { recursive: true }); } catch { /* ignore */ }
    throw err;
  }
}

export function cleanupTempDir(tempDir: string): void {
  try { rmSync(tempDir, { recursive: true }); } catch { /* ignore */ }
}
