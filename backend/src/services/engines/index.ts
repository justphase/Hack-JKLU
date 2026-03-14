/**
 * Engine Registry and Orchestrator
 *
 * Available engines:
 *   - sast        : Regex-based static analysis (JS/TS/Python) ✅ Phase 2A
 *   - ai          : Gemini-powered deep code review ✅
 *   - sca         : Dependency vulnerability scanner (Phase 2B)
 *   - secrets     : Hardcoded credential detector   (Phase 2C)
 *   - api-security: OpenAPI spec validator          (Phase 2D)
 */

import { sastEngine } from "./sastEngine.js";
import { aiEngine } from "./aiEngine.js";
import { scaEngine } from "./scaEngine.js";
import { secretsEngine } from "./secretsEngine.js";
import { apiSecurityEngine } from "./apiSecurityEngine.js";
import type { Engine, EngineType, FileInput, ScanResult } from "./types.js";

// Registry — all 5 engines
const ENGINES: Record<EngineType, Engine> = {
  "sast":         sastEngine,
  "ai":           aiEngine,
  "sca":          scaEngine,
  "secrets":      secretsEngine,
  "api-security": apiSecurityEngine,
};

/**
 * Run a specific engine against a set of files.
 */
export async function runEngine(
  engineType: EngineType,
  files: FileInput[]
): Promise<ScanResult> {
  const engine = ENGINES[engineType];

  if (!engine) {
    return {
      engine: engineType,
      vulnerabilities: [],
      scanDurationMs: 0,
      filesScanned: 0,
      error: `Engine '${engineType}' is not yet implemented.`,
    };
  }

  try {
    return await engine.run(files);
  } catch (err) {
    return {
      engine: engineType,
      vulnerabilities: [],
      scanDurationMs: 0,
      filesScanned: files.length,
      error: err instanceof Error ? err.message : "Unknown engine error",
    };
  }
}

/**
 * Run SAST + SCA engines (local/fast, no AI).
 */
export async function runAllEngines(files: FileInput[]): Promise<ScanResult[]> {
  return Promise.all([
    runEngine("sast", files),
    runEngine("sca", files),
    runEngine("secrets", files),
    runEngine("api-security", files),
  ]);
}

/**
 * Run SAST + Gemini AI + SCA all in parallel.
 * This is the primary scan function for every upload.
 */
export async function runWithAI(files: FileInput[]): Promise<ScanResult[]> {
  const [sastResults, aiResults, scaResults, secretsResults, apiResults] = await Promise.all([
    runEngine("sast", files),
    runEngine("ai", files),
    runEngine("sca", files),
    runEngine("secrets", files),
    runEngine("api-security", files),
  ]);

  // Deduplicate AI findings that overlap with SAST (by title + line)
  const sastKeys = new Set(
    sastResults.vulnerabilities.map((v) => `${v.title}:${v.lineNumber}`)
  );
  const uniqueAIVulns = aiResults.vulnerabilities.filter(
    (v) => !sastKeys.has(`${v.title}:${v.lineNumber}`)
  );

  return [
    sastResults,
    { ...aiResults, vulnerabilities: uniqueAIVulns },
    scaResults,
    secretsResults,
    apiResults,
  ];
}

/**
 * Returns a combined risk score (0–100) from all scan results.
 *
 * Weights:
 *   critical → 25 pts each (max 50)
 *   high     → 15 pts each (max 30)
 *   medium   → 5  pts each (max 15)
 *   low      → 1  pt  each (max 5)
 */
export function calculateRiskScore(results: ScanResult[]): number {
  const allVulns = results.flatMap((r) => r.vulnerabilities);

  const counts = {
    critical: allVulns.filter((v) => v.severity === "critical").length,
    high:     allVulns.filter((v) => v.severity === "high").length,
    medium:   allVulns.filter((v) => v.severity === "medium").length,
    low:      allVulns.filter((v) => v.severity === "low").length,
  };

  const score =
    Math.min(counts.critical * 25, 50) +
    Math.min(counts.high * 15, 30) +
    Math.min(counts.medium * 5, 15) +
    Math.min(counts.low * 1, 5);

  return Math.min(score, 100);
}

export type { EngineType, FileInput, ScanResult, Vulnerability } from "./types.js";
