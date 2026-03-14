/**
 * Input Router — Maps file extensions to the appropriate scan engines.
 *
 * Engine types:
 *  - sast:         Static Application Security Testing (code analysis)
 *  - sca:          Software Composition Analysis (dependency scanning)
 *  - secrets:      Secret Guardian (hardcoded keys/tokens)
 *  - api-security: API Security (OpenAPI spec validation)
 */

export type EngineType = "sast" | "sca" | "secrets" | "api-security";

interface EngineAssignment {
  filename: string;
  engines: EngineType[];
}

// File extension → engine mapping
const EXTENSION_ENGINE_MAP: Record<string, EngineType[]> = {
  // SAST — code files
  ".js": ["sast"],
  ".jsx": ["sast"],
  ".ts": ["sast"],
  ".tsx": ["sast"],
  ".py": ["sast"],
  ".mjs": ["sast"],
  ".cjs": ["sast"],

  // SCA — dependency/package files
  ".json": ["sca"], // package.json, package-lock.json
  ".lock": ["sca"], // yarn.lock, pnpm-lock.yaml

  // Secrets — config / env files
  ".env": ["secrets"],
  ".ini": ["secrets"],
  ".cfg": ["secrets"],
  ".conf": ["secrets"],
  ".toml": ["secrets"],

  // API Security — OpenAPI specs
  ".yaml": ["api-security"],
  ".yml": ["api-security"],
};

// Filename-specific overrides (exact match)
const FILENAME_ENGINE_MAP: Record<string, EngineType[]> = {
  "package.json": ["sca"],
  "package-lock.json": ["sca"],
  "yarn.lock": ["sca"],
  "pnpm-lock.yaml": ["sca"],
  "Pipfile": ["sca"],
  "Pipfile.lock": ["sca"],
  "requirements.txt": ["sca"],
  "pyproject.toml": ["sca"],
  ".env": ["secrets"],
  ".env.local": ["secrets"],
  ".env.production": ["secrets"],
  ".env.development": ["secrets"],
  "openapi.yaml": ["api-security"],
  "openapi.yml": ["api-security"],
  "swagger.yaml": ["api-security"],
  "swagger.yml": ["api-security"],
  "swagger.json": ["api-security"],
};

/**
 * Given a list of filenames, determines which engines should process each file.
 */
export function routeFilesToEngines(filenames: string[]): EngineAssignment[] {
  return filenames.map((filename) => {
    const basename = filename.split("/").pop() || filename;
    const ext = "." + basename.split(".").pop()?.toLowerCase();

    // Check exact filename match first
    if (FILENAME_ENGINE_MAP[basename]) {
      return { filename, engines: FILENAME_ENGINE_MAP[basename] };
    }

    // Check extension match
    if (ext && EXTENSION_ENGINE_MAP[ext]) {
      return { filename, engines: EXTENSION_ENGINE_MAP[ext] };
    }

    // Default: run secrets scanner on unknown files (might contain sensitive data)
    return { filename, engines: ["secrets"] as EngineType[] };
  });
}

/**
 * Returns the unique set of engines needed for a list of files.
 */
export function getRequiredEngines(filenames: string[]): EngineType[] {
  const assignments = routeFilesToEngines(filenames);
  const engineSet = new Set<EngineType>();
  assignments.forEach((a) => a.engines.forEach((e) => engineSet.add(e)));
  return Array.from(engineSet);
}
