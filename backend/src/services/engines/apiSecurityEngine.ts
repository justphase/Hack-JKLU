/**
 * API Security Engine — Phase 2D
 *
 * Validates OpenAPI (Swagger) specifications for security vulnerabilities.
 * Checks for missing authentication, insecure endpoints, excessive data
 * exposure, and security best-practice violations.
 *
 * Supports: openapi.yaml, openapi.json, swagger.yaml, swagger.json
 */

import type { Engine, FileInput, ScanResult, Vulnerability } from "./types.js";

// ─── OpenAPI Parsing (loose, handles YAML & JSON) ──────────────────────────

interface OpenAPISpec {
  openapi?: string;
  swagger?: string;
  info?: { title?: string; version?: string };
  servers?: { url?: string }[];
  host?: string;
  basePath?: string;
  schemes?: string[];
  paths?: Record<string, Record<string, EndpointDef>>;
  security?: SecurityReq[];
  securityDefinitions?: Record<string, unknown>;
  components?: {
    securitySchemes?: Record<string, unknown>;
    schemas?: Record<string, SchemaDef>;
  };
}

interface EndpointDef {
  summary?: string;
  security?: SecurityReq[];
  parameters?: ParamDef[];
  requestBody?: unknown;
  responses?: Record<string, unknown>;
  deprecated?: boolean;
}

interface SecurityReq {
  [scheme: string]: string[];
}

interface ParamDef {
  name: string;
  in: string;
  schema?: { type?: string };
  type?: string;
  required?: boolean;
}

interface SchemaDef {
  type?: string;
  properties?: Record<string, { type?: string; format?: string; description?: string }>;
}

// Simple YAML parser for common OpenAPI patterns (no external dependency)
function parseYAMLish(content: string): OpenAPISpec {
  try {
    // Try JSON first
    return JSON.parse(content);
  } catch {
    // Simple YAML-to-object conversion for OpenAPI specs
    // This is lightweight — it handles common YAML patterns used in OpenAPI
    const result: Record<string, unknown> = {};
    const lines = content.split("\n");

    // Check if it looks like an OpenAPI spec
    const hasOpenapi = lines.some((l) => /^openapi\s*:/i.test(l.trim()));
    const hasSwagger = lines.some((l) => /^swagger\s*:/i.test(l.trim()));
    if (!hasOpenapi && !hasSwagger) return result as OpenAPISpec;

    // Extract key fields with regex
    const openapiMatch = content.match(/^openapi\s*:\s*["']?([^"'\n]+)["']?/m);
    if (openapiMatch) result.openapi = openapiMatch[1].trim();

    const swaggerMatch = content.match(/^swagger\s*:\s*["']?([^"'\n]+)["']?/m);
    if (swaggerMatch) result.swagger = swaggerMatch[1].trim();

    // Check for security section
    const hasGlobalSecurity = /^security\s*:/m.test(content);
    if (hasGlobalSecurity) result.security = [{ _present: [] }];

    // Check for securitySchemes/securityDefinitions  
    const hasSecSchemes = /securitySchemes\s*:/m.test(content) || /securityDefinitions\s*:/m.test(content);
    if (hasSecSchemes) {
      result.components = { securitySchemes: { _present: {} } };
    }

    // Extract paths
    const pathsMatch = content.match(/^paths\s*:\s*\n([\s\S]*?)(?=\n[a-zA-Z]|\n$|$)/m);
    if (pathsMatch) {
      const pathsBlock = pathsMatch[1];
      const paths: Record<string, Record<string, EndpointDef>> = {};
      const pathMatches = pathsBlock.matchAll(/^  (\/[^\s:]*)\s*:/gm);

      for (const pm of pathMatches) {
        const pathStr = pm[1];
        paths[pathStr] = {};

        // Find methods under this path
        const pathStart = (pm.index ?? 0) + pm[0].length;
        const nextPath = pathsBlock.indexOf("\n  /", pathStart);
        const pathSection = pathsBlock.slice(pathStart, nextPath === -1 ? undefined : nextPath);

        const methods = ["get", "post", "put", "patch", "delete", "head", "options"];
        for (const method of methods) {
          const methodRegex = new RegExp(`^    ${method}\\s*:`, "m");
          if (methodRegex.test(pathSection)) {
            const endpointDef: EndpointDef = {};
            // Check for endpoint-level security
            const methodStart = pathSection.search(methodRegex);
            const nextMethod = pathSection.slice(methodStart + 1).search(/^    (get|post|put|patch|delete|head|options)\s*:/m);
            const methodSection = pathSection.slice(methodStart, nextMethod === -1 ? undefined : methodStart + 1 + nextMethod);

            if (/security\s*:\s*\[\s*\]/m.test(methodSection)) {
              endpointDef.security = []; // explicitly no security
            } else if (/security\s*:/m.test(methodSection)) {
              endpointDef.security = [{ _present: [] }];
            }

            // Check for parameters
            if (/parameters\s*:/m.test(methodSection)) {
              endpointDef.parameters = [];
              const paramMatches = methodSection.matchAll(/- name\s*:\s*["']?(\w+)["']?/g);
              for (const paramMatch of paramMatches) {
                const paramName = paramMatch[1];
                const inMatch = methodSection.slice(paramMatch.index).match(/in\s*:\s*["']?(\w+)["']?/);
                endpointDef.parameters.push({
                  name: paramName,
                  in: inMatch?.[1] ?? "query",
                });
              }
            }

            paths[pathStr][method] = endpointDef;
          }
        }
      }
      result.paths = paths;
    }

    // Extract servers
    const serversMatch = content.match(/^servers\s*:\s*\n([\s\S]*?)(?=\n[a-zA-Z]|\n$|$)/m);
    if (serversMatch) {
      const serverUrls = [...serversMatch[1].matchAll(/url\s*:\s*["']?([^"'\n]+)["']?/g)];
      result.servers = serverUrls.map((m) => ({ url: m[1].trim() }));
    }

    // Swagger v2: host & schemes
    const hostMatch = content.match(/^host\s*:\s*["']?([^"'\n]+)["']?/m);
    if (hostMatch) result.host = hostMatch[1].trim();

    const schemesMatch = content.match(/^schemes\s*:\s*\n([\s\S]*?)(?=\n[a-zA-Z])/m);
    if (schemesMatch) {
      result.schemes = [...schemesMatch[1].matchAll(/-\s*(\w+)/g)].map((m) => m[1]);
    }

    return result as OpenAPISpec;
  }
}

// ─── Security Checks ──────────────────────────────────────────────────────────

type CheckFn = (spec: OpenAPISpec, filename: string) => Vulnerability[];

const checks: CheckFn[] = [
  // 1. No global security defined
  (spec, filename) => {
    if (!spec.security || spec.security.length === 0) {
      const hasSchemes =
        spec.components?.securitySchemes ||
        spec.securityDefinitions;
      if (!hasSchemes) {
        return [{
          engine: "api-security",
          severity: "critical",
          title: "No Authentication Defined",
          description: "The API specification has no security schemes or global security requirements defined. All endpoints are publicly accessible without authentication.",
          filePath: filename,
          fixSuggestion: "Add a securitySchemes section (e.g., Bearer JWT, API Key, OAuth2) and apply a global security requirement.",
          cweId: "CWE-306",
        }];
      }
      return [{
        engine: "api-security",
        severity: "high",
        title: "No Global Security Requirement",
        description: "Security schemes are defined but no global security requirement is set. Each endpoint must explicitly opt-in to authentication, which is error-prone.",
        filePath: filename,
        fixSuggestion: "Add a top-level 'security' section to apply authentication globally. Use 'security: []' on specific endpoints that should be public (e.g., /health).",
        cweId: "CWE-306",
      }];
    }
    return [];
  },

  // 2. Endpoints with explicitly disabled security
  (spec, filename) => {
    const vulns: Vulnerability[] = [];
    for (const [path, methods] of Object.entries(spec.paths ?? {})) {
      for (const [method, def] of Object.entries(methods)) {
        if (Array.isArray(def?.security) && def.security.length === 0) {
          const isSafe = ["/health", "/ping", "/status", "/.well-known", "/docs", "/openapi"].some(
            (s) => path.toLowerCase().startsWith(s)
          );
          if (!isSafe) {
            vulns.push({
              engine: "api-security",
              severity: "high",
              title: `Unauthenticated Endpoint: ${method.toUpperCase()} ${path}`,
              description: `The endpoint ${method.toUpperCase()} ${path} explicitly disables security (security: []) and is publicly accessible. This may expose sensitive operations.`,
              filePath: filename,
              fixSuggestion: `Remove 'security: []' from this endpoint or ensure it genuinely needs to be public.`,
              cweId: "CWE-306",
            });
          }
        }
      }
    }
    return vulns;
  },

  // 3. Sensitive operations without authentication
  (spec, filename) => {
    const vulns: Vulnerability[] = [];
    const writeMethods = new Set(["post", "put", "patch", "delete"]);
    const hasGlobalSecurity = spec.security && spec.security.length > 0;

    for (const [path, methods] of Object.entries(spec.paths ?? {})) {
      for (const [method, def] of Object.entries(methods)) {
        if (writeMethods.has(method)) {
          const hasEndpointSecurity = def?.security && def.security.length > 0;
          if (!hasGlobalSecurity && !hasEndpointSecurity) {
            vulns.push({
              engine: "api-security",
              severity: "critical",
              title: `Write Operation Without Auth: ${method.toUpperCase()} ${path}`,
              description: `${method.toUpperCase()} ${path} is a data-modifying operation with no authentication. Attackers can freely modify or delete data.`,
              filePath: filename,
              fixSuggestion: `Add authentication to this endpoint — either via global security or endpoint-level security.`,
              cweId: "CWE-862",
            });
          }
        }
      }
    }
    return vulns;
  },

  // 4. HTTP instead of HTTPS
  (spec, filename) => {
    const vulns: Vulnerability[] = [];
    // OpenAPI v3 servers
    for (const server of spec.servers ?? []) {
      if (server.url?.startsWith("http://") && !server.url.includes("localhost") && !server.url.includes("127.0.0.1")) {
        vulns.push({
          engine: "api-security",
          severity: "high",
          title: `Insecure Server URL: ${server.url}`,
          description: `The API server uses HTTP instead of HTTPS. All traffic, including authentication tokens and sensitive data, will be transmitted in plaintext.`,
          filePath: filename,
          fixSuggestion: `Change the server URL to use HTTPS: ${server.url.replace("http://", "https://")}`,
          cweId: "CWE-319",
        });
      }
    }
    // Swagger v2 schemes
    if (spec.schemes?.includes("http") && !spec.schemes.includes("https")) {
      vulns.push({
        engine: "api-security",
        severity: "high",
        title: "API Only Supports HTTP (No HTTPS)",
        description: "The API spec defines HTTP but not HTTPS in its schemes. All traffic is unencrypted.",
        filePath: filename,
        fixSuggestion: "Add 'https' to the schemes list and remove 'http'.",
        cweId: "CWE-319",
      });
    }
    return vulns;
  },

  // 5. Sensitive data in query parameters
  (spec, filename) => {
    const vulns: Vulnerability[] = [];
    const sensitiveNames = new Set(["password", "token", "apikey", "api_key", "secret", "authorization", "credential", "ssn", "credit_card"]);

    for (const [path, methods] of Object.entries(spec.paths ?? {})) {
      for (const [method, def] of Object.entries(methods)) {
        for (const param of def?.parameters ?? []) {
          if (param.in === "query" && sensitiveNames.has(param.name.toLowerCase())) {
            vulns.push({
              engine: "api-security",
              severity: "high",
              title: `Sensitive Data in Query String: ${param.name}`,
              description: `The parameter '${param.name}' is passed in the query string at ${method.toUpperCase()} ${path}. Query strings are logged by servers, proxies, and browsers, exposing sensitive data.`,
              filePath: filename,
              fixSuggestion: `Move '${param.name}' to the request header or body instead of the query string.`,
              cweId: "CWE-598",
            });
          }
        }
      }
    }
    return vulns;
  },

  // 6. Admin/internal endpoints exposed
  (spec, filename) => {
    const vulns: Vulnerability[] = [];
    const sensitivePatterns = ["/admin", "/internal", "/debug", "/actuator", "/metrics", "/graphql"];
    for (const path of Object.keys(spec.paths ?? {})) {
      const lower = path.toLowerCase();
      for (const pattern of sensitivePatterns) {
        if (lower.includes(pattern)) {
          vulns.push({
            engine: "api-security",
            severity: "medium",
            title: `Sensitive Endpoint Exposed: ${path}`,
            description: `The path '${path}' looks like an internal/admin endpoint that should not be publicly documented in the API specification.`,
            filePath: filename,
            fixSuggestion: `Remove ${path} from the public API spec, or ensure it has strict authentication and authorization.`,
            cweId: "CWE-215",
          });
        }
      }
    }
    return vulns;
  },

  // 7. Missing rate limiting indicators
  (spec, filename) => {
    const allPaths = Object.keys(spec.paths ?? {});
    const authPaths = allPaths.filter((p) =>
      ["/login", "/auth", "/signin", "/signup", "/register", "/token", "/oauth"].some((a) => p.toLowerCase().includes(a))
    );
    const vulns: Vulnerability[] = [];
    for (const path of authPaths) {
      vulns.push({
        engine: "api-security",
        severity: "medium",
        title: `Auth Endpoint May Lack Rate Limiting: ${path}`,
        description: `The authentication endpoint '${path}' should have rate limiting to prevent brute-force attacks. OpenAPI alone cannot enforce this, but it should be documented.`,
        filePath: filename,
        fixSuggestion: `Implement rate limiting (e.g., 5 requests/minute) on ${path} and document it with x-ratelimit headers in the spec.`,
        cweId: "CWE-307",
      });
    }
    return vulns;
  },

  // 8. Wildcard CORS or missing CORS info
  (spec, filename) => {
    const raw = JSON.stringify(spec);
    if (/Access-Control-Allow-Origin.*\*/i.test(raw)) {
      return [{
        engine: "api-security",
        severity: "high",
        title: "Wildcard CORS Policy Detected",
        description: "The API uses Access-Control-Allow-Origin: * which allows any website to make requests to the API, potentially enabling CSRF and data theft.",
        filePath: filename,
        fixSuggestion: "Restrict CORS to specific trusted origins instead of using wildcard (*).",
        cweId: "CWE-346",
      }];
    }
    return [];
  },
];

// ─── Target files ─────────────────────────────────────────────────────────────

const API_FILES = new Set([
  "openapi.yaml", "openapi.yml", "openapi.json",
  "swagger.yaml", "swagger.yml", "swagger.json",
  "api-spec.yaml", "api-spec.yml", "api-spec.json",
]);

function isApiSpecFile(filename: string): boolean {
  const basename = filename.split("/").pop()?.toLowerCase() ?? "";
  return API_FILES.has(basename);
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export const apiSecurityEngine: Engine = {
  name: "api-security",
  supportedExtensions: ["yaml", "yml", "json"],

  async run(files: FileInput[]): Promise<ScanResult> {
    const start = Date.now();
    const vulnerabilities: Vulnerability[] = [];

    const specFiles = files.filter((f) => isApiSpecFile(f.filename));

    if (specFiles.length === 0) {
      return {
        engine: "api-security",
        vulnerabilities: [],
        filesScanned: 0,
        scanDurationMs: Date.now() - start,
      };
    }

    for (const file of specFiles) {
      const spec = parseYAMLish(file.content);

      // Skip if it doesn't look like an API spec
      if (!spec.openapi && !spec.swagger) continue;

      for (const check of checks) {
        vulnerabilities.push(...check(spec, file.filename));
      }
    }

    return {
      engine: "api-security",
      vulnerabilities,
      filesScanned: specFiles.length,
      scanDurationMs: Date.now() - start,
    };
  },
};
