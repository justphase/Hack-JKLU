/**
 * SCA Engine — Software Composition Analysis
 *
 * Detects known vulnerabilities in third-party dependencies
 * by querying the Google OSV (Open Source Vulnerabilities) API.
 *
 * Supports: package.json (npm/yarn), requirements.txt (Python/PyPI)
 */

import type { Engine, FileInput, ScanResult, Vulnerability } from "./types.js";

const OSV_API = "https://api.osv.dev/v1/querybatch";

// ─── OSV API response shapes ──────────────────────────────────────────────────

interface OsvVulnerability {
  id: string;
  summary?: string;
  details?: string;
  severity?: { type: string; score: string }[];
  affected?: {
    package?: { name: string; ecosystem: string };
    ranges?: { type: string; events: { fixed?: string }[] }[];
    versions?: string[];
  }[];
  references?: { type: string; url: string }[];
  database_specific?: { severity?: string; cwe_ids?: string[] };
}

interface OsvBatchResponse {
  results: { vulns?: OsvVulnerability[] }[];
}

// ─── Parsers ──────────────────────────────────────────────────────────────────

interface Dep {
  name: string;
  version: string;
  ecosystem: "npm" | "PyPI";
}

function parsePackageJson(content: string): Dep[] {
  try {
    const parsed = JSON.parse(content);
    const deps: Dep[] = [];
    for (const section of ["dependencies", "devDependencies", "peerDependencies"]) {
      const block = parsed[section] ?? {};
      for (const [name, versionRaw] of Object.entries(block)) {
        // Strip semver range prefixes like ^, ~, >=
        const version = String(versionRaw).replace(/^[\^~>=<]+/, "").trim();
        if (version && version !== "*" && version !== "latest") {
          deps.push({ name, version, ecosystem: "npm" });
        }
      }
    }
    return deps;
  } catch {
    return [];
  }
}

function parseRequirementsTxt(content: string): Dep[] {
  const deps: Dep[] = [];
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("-")) continue;
    // Match: package==1.2.3 or package>=1.2.3 or package~=1.2.3
    const match = line.match(/^([A-Za-z0-9_.-]+)[=><~!]+([A-Za-z0-9._-]+)/);
    if (match) {
      deps.push({ name: match[1], version: match[2], ecosystem: "PyPI" });
    }
  }
  return deps;
}

// ─── Severity mapping ─────────────────────────────────────────────────────────

function mapSeverity(vuln: OsvVulnerability): Vulnerability["severity"] {
  const dbSev = vuln.database_specific?.severity?.toLowerCase();
  if (dbSev === "critical") return "critical";
  if (dbSev === "high") return "high";
  if (dbSev === "moderate" || dbSev === "medium") return "medium";
  if (dbSev === "low") return "low";

  // Fall back to CVSS score
  const cvss = vuln.severity?.find((s) => s.type.startsWith("CVSS"));
  if (cvss) {
    const score = parseFloat(cvss.score);
    if (score >= 9.0) return "critical";
    if (score >= 7.0) return "high";
    if (score >= 4.0) return "medium";
    return "low";
  }

  return "medium";
}

function getFixedVersion(vuln: OsvVulnerability, dep: Dep): string | null {
  for (const affected of vuln.affected ?? []) {
    if (affected.package?.name.toLowerCase() === dep.name.toLowerCase()) {
      for (const range of affected.ranges ?? []) {
        const fixedEvent = range.events?.find((e) => e.fixed);
        if (fixedEvent?.fixed) return fixedEvent.fixed;
      }
    }
  }
  return null;
}

// ─── OSV query ────────────────────────────────────────────────────────────────

async function queryOSV(deps: Dep[]): Promise<Map<number, OsvVulnerability[]>> {
  const queries = deps.map((dep) => ({
    version: dep.version,
    package: { name: dep.name, ecosystem: dep.ecosystem },
  }));

  const response = await fetch(OSV_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ queries }),
  });

  if (!response.ok) {
    throw new Error(`OSV API error: ${response.status} ${response.statusText}`);
  }

  const data: OsvBatchResponse = await response.json();
  const resultMap = new Map<number, OsvVulnerability[]>();
  data.results.forEach((result, i) => {
    if (result.vulns && result.vulns.length > 0) {
      resultMap.set(i, result.vulns);
    }
  });
  return resultMap;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

const SCA_EXTENSIONS = new Set(["package.json", "requirements.txt"]);

export const scaEngine: Engine = {
  name: "sca",
  supportedExtensions: ["json", "txt"],

  async run(files: FileInput[]): Promise<ScanResult> {
    const start = Date.now();
    const vulnerabilities: Vulnerability[] = [];

    // Filter to only SCA-relevant files
    const scaFiles = files.filter((f) =>
      SCA_EXTENSIONS.has(f.filename.split("/").pop()?.toLowerCase() ?? "")
    );

    if (scaFiles.length === 0) {
      return {
        engine: "sca",
        vulnerabilities: [],
        filesScanned: 0,
        scanDurationMs: Date.now() - start,
      };
    }

    for (const file of scaFiles) {
      const filename = file.filename.split("/").pop()?.toLowerCase() ?? "";
      let deps: Dep[] = [];

      if (filename === "package.json") deps = parsePackageJson(file.content);
      else if (filename === "requirements.txt") deps = parseRequirementsTxt(file.content);

      if (deps.length === 0) continue;

      try {
        // OSV has a 1000-query limit per batch; chunk if needed
        const CHUNK = 100;
        for (let i = 0; i < deps.length; i += CHUNK) {
          const chunk = deps.slice(i, i + CHUNK);
          const resultMap = await queryOSV(chunk);

          for (const [idx, vulns] of resultMap.entries()) {
            const dep = chunk[idx];
            for (const vuln of vulns) {
              const severity = mapSeverity(vuln);
              const fixedVersion = getFixedVersion(vuln, dep);
              const cweIds = vuln.database_specific?.cwe_ids ?? [];

              vulnerabilities.push({
                engine: "sca",
                severity,
                title: `Vulnerable Dependency: ${dep.name}@${dep.version}`,
                description:
                  vuln.summary ??
                  `Package '${dep.name}' version ${dep.version} has a known security vulnerability (${vuln.id}).`,
                filePath: file.filename,
                lineNumber: undefined,
                codeSnippet: `"${dep.name}": "${dep.version}"`,
                fixSuggestion: fixedVersion
                  ? `Upgrade ${dep.name} to version ${fixedVersion} or later. Run: npm install ${dep.name}@${fixedVersion}`
                  : `Remove or replace ${dep.name}@${dep.version}. Check https://osv.dev/vulnerability/${vuln.id} for details.`,
                cweId: cweIds[0] ?? vuln.id,
              });
            }
          }
        }
      } catch (err) {
        console.error(`[SCA Engine] OSV query failed for ${file.filename}:`, err);
      }
    }

    return {
      engine: "sca",
      vulnerabilities,
      filesScanned: scaFiles.length,
      scanDurationMs: Date.now() - start,
    };
  },
};
