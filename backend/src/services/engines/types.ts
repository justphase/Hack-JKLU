/**
 * Shared types for all scan engines.
 * Every engine receives FileInput[] and returns ScanResult.
 */

export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type EngineType = "sast" | "ai" | "sca" | "secrets" | "api-security";

export interface FileInput {
  filename: string;
  content: string; // raw text content
}

export interface Vulnerability {
  engine: string;
  severity: Severity;
  title: string;
  description: string;
  filePath: string;
  lineNumber?: number;
  codeSnippet?: string;
  fixSuggestion: string;
  cweId?: string;       // e.g. "CWE-79"
  cvssScore?: number;   // e.g. 8.5
}

export interface ScanResult {
  engine: EngineType;
  vulnerabilities: Vulnerability[];
  scanDurationMs: number;
  filesScanned: number;
  error?: string;
}

/** The common interface every engine must implement */
export interface Engine {
  name: EngineType;
  supportedExtensions: string[];
  run(files: FileInput[]): Promise<ScanResult>;
}
