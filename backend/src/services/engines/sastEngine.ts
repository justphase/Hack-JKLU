/**
 * SAST Engine — Static Application Security Testing
 *
 * Scans JavaScript, TypeScript, and Python source files for common
 * security vulnerabilities using regex pattern matching.
 */

import type { Engine, EngineType, FileInput, ScanResult, Severity, Vulnerability } from "./types.js";

// --- Pattern definitions ---

interface SastPattern {
  id: string;
  title: string;
  description: string;
  regex: RegExp;
  severity: Severity;
  cweId: string;
  fixSuggestion: string;
  languages: string[]; // file extensions this pattern applies to
}

const SAST_PATTERNS: SastPattern[] = [
  // ──────────────── CRITICAL ────────────────
  {
    id: "S001",
    title: "Use of eval()",
    description:
      "eval() executes arbitrary code from a string. This is extremely dangerous and can lead to remote code execution if user input reaches it.",
    regex: /\beval\s*\(/g,
    severity: "critical",
    cweId: "CWE-95",
    fixSuggestion:
      "Remove eval() entirely. Use JSON.parse() for JSON, or restructure the logic to avoid dynamic code execution.",
    languages: [".js", ".jsx", ".ts", ".tsx"],
  },
  {
    id: "S002",
    title: "SQL Injection via String Concatenation",
    description:
      "Building SQL queries by concatenating user-controlled input allows attackers to manipulate the query structure.",
    regex: /(['"`])\s*(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\s.*?\+/gi,
    severity: "critical",
    cweId: "CWE-89",
    fixSuggestion:
      "Use parameterized queries or a query builder/ORM instead of string concatenation.",
    languages: [".js", ".jsx", ".ts", ".tsx", ".py"],
  },
  {
    id: "S003",
    title: "Command Injection via exec/spawn",
    description:
      "Passing user-controlled input to exec() or spawn() can allow attackers to execute arbitrary OS commands.",
    regex: /\b(exec|execSync|spawn|spawnSync)\s*\(\s*[^)]*\+/g,
    severity: "critical",
    cweId: "CWE-78",
    fixSuggestion:
      "Never pass user input to shell commands. Use allow-lists or child_process.execFile() with separate arguments instead.",
    languages: [".js", ".jsx", ".ts", ".tsx"],
  },
  {
    id: "S004",
    title: "Python subprocess with shell=True",
    description:
      "Using subprocess with shell=True and user input can lead to OS command injection.",
    regex: /subprocess\.(run|call|Popen|check_output)\s*\([^)]*shell\s*=\s*True/g,
    severity: "critical",
    cweId: "CWE-78",
    fixSuggestion:
      "Set shell=False and pass command as a list of strings instead of a single string.",
    languages: [".py"],
  },

  // ──────────────── HIGH ────────────────
  {
    id: "S005",
    title: "XSS via innerHTML Assignment",
    description:
      "Assigning user-controlled data to innerHTML can allow cross-site scripting (XSS) attacks.",
    regex: /\.innerHTML\s*=/g,
    severity: "high",
    cweId: "CWE-79",
    fixSuggestion:
      "Use textContent instead of innerHTML, or sanitize HTML with DOMPurify before assignment.",
    languages: [".js", ".jsx", ".ts", ".tsx"],
  },
  {
    id: "S006",
    title: "XSS via dangerouslySetInnerHTML",
    description:
      "dangerouslySetInnerHTML bypasses React's XSS protections and can expose the app to script injection.",
    regex: /dangerouslySetInnerHTML\s*=\s*\{/g,
    severity: "high",
    cweId: "CWE-79",
    fixSuggestion:
      "Avoid dangerouslySetInnerHTML. If required, sanitize the HTML using DOMPurify before passing it.",
    languages: [".js", ".jsx", ".ts", ".tsx"],
  },
  {
    id: "S007",
    title: "XSS via document.write()",
    description:
      "document.write() with user-controlled input can inject malicious scripts into the page.",
    regex: /document\.write\s*\(/g,
    severity: "high",
    cweId: "CWE-79",
    fixSuggestion:
      "Replace document.write() with DOM manipulation methods like createElement() and appendChild().",
    languages: [".js", ".jsx", ".ts", ".tsx"],
  },
  {
    id: "S008",
    title: "Python exec() Call",
    description:
      "Python's exec() executes arbitrary code from a string, which is dangerous with user-controlled input.",
    regex: /\bexec\s*\(/g,
    severity: "high",
    cweId: "CWE-95",
    fixSuggestion:
      "Avoid exec() entirely. Refactor logic to use standard control flow.",
    languages: [".py"],
  },
  {
    id: "S009",
    title: "Prototype Pollution Risk",
    description:
      "Merging user-supplied objects without sanitization can allow prototype pollution attacks.",
    regex: /Object\.(assign|merge)\s*\(\s*[^,)]+,\s*req\.(body|query|params)/g,
    severity: "high",
    cweId: "CWE-1321",
    fixSuggestion:
      "Validate and sanitize user input before merging. Use Object.create(null) for dictionaries or a safe merge library.",
    languages: [".js", ".jsx", ".ts", ".tsx"],
  },
  {
    id: "S010",
    title: "Use of Math.random() for Security Purposes",
    description:
      "Math.random() is not cryptographically secure and should not be used for tokens, passwords, or IDs.",
    regex: /Math\.random\s*\(\)/g,
    severity: "high",
    cweId: "CWE-338",
    fixSuggestion:
      "Use crypto.randomUUID(), crypto.getRandomValues(), or the 'crypto' module for security-sensitive randomness.",
    languages: [".js", ".jsx", ".ts", ".tsx"],
  },

  // ──────────────── MEDIUM ────────────────
  {
    id: "S011",
    title: "Insecure HTTP URL (non-HTTPS)",
    description:
      "Hardcoded HTTP URLs transmit data in plaintext, making it vulnerable to interception.",
    regex: /['"`]http:\/\/(?!localhost|127\.0\.0\.1)/g,
    severity: "medium",
    cweId: "CWE-319",
    fixSuggestion:
      "Replace http:// with https:// for all external URLs.",
    languages: [".js", ".jsx", ".ts", ".tsx", ".py"],
  },
  {
    id: "S012",
    title: "Disabled SSL/TLS Verification",
    description:
      "Disabling certificate verification allows man-in-the-middle attacks.",
    regex: /rejectUnauthorized\s*:\s*false|verify\s*=\s*False/g,
    severity: "medium",
    cweId: "CWE-295",
    fixSuggestion:
      "Never disable SSL verification in production. Use a proper CA certificate bundle instead.",
    languages: [".js", ".jsx", ".ts", ".tsx", ".py"],
  },
  {
    id: "S013",
    title: "Weak Hashing Algorithm (MD5/SHA1)",
    description:
      "MD5 and SHA1 are cryptographically broken and should not be used for passwords or integrity checks.",
    regex: /createHash\s*\(\s*['"`](md5|sha1)['"`]\s*\)|hashlib\.(md5|sha1)\s*\(/gi,
    severity: "medium",
    cweId: "CWE-327",
    fixSuggestion:
      "Use SHA-256 or SHA-3 for hashing, and bcrypt/argon2 for passwords.",
    languages: [".js", ".jsx", ".ts", ".tsx", ".py"],
  },

  // ──────────────── LOW ────────────────
  {
    id: "S014",
    title: "Sensitive Data in console.log()",
    description:
      "Logging sensitive variables (passwords, tokens, keys) can expose them in production logs.",
    regex: /console\.log\s*\([^)]*?(password|token|secret|key|auth)[^)]*\)/gi,
    severity: "low",
    cweId: "CWE-532",
    fixSuggestion:
      "Remove sensitive data from logging. Use a structured logger with redaction for production.",
    languages: [".js", ".jsx", ".ts", ".tsx"],
  },
  {
    id: "S015",
    title: "Python print() with Sensitive Data",
    description:
      "Printing sensitive variables can expose credentials in logs or console output.",
    regex: /print\s*\([^)]*?(password|token|secret|key|auth)[^)]*\)/gi,
    severity: "low",
    cweId: "CWE-532",
    fixSuggestion:
      "Remove sensitive data from print statements. Use Python's logging module with appropriate log levels.",
    languages: [".py"],
  },
];

// --- Supported file extensions ---
const SUPPORTED_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".py"];

// --- Helper: extract line number from content at match index ---
function getLineNumber(content: string, index: number): number {
  return content.substring(0, index).split("\n").length;
}

// --- Helper: extract surrounding code snippet ---
function getCodeSnippet(content: string, lineNumber: number): string {
  const lines = content.split("\n");
  const start = Math.max(0, lineNumber - 2);
  const end = Math.min(lines.length, lineNumber + 1);
  return lines
    .slice(start, end)
    .map((line, i) => `${start + i + 1}: ${line}`)
    .join("\n");
}

// --- Helper: get file extension ---
function getExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? `.${parts[parts.length - 1].toLowerCase()}` : "";
}

// --- Main SAST Engine ---
export const sastEngine: Engine = {
  name: "sast" as EngineType,
  supportedExtensions: SUPPORTED_EXTENSIONS,

  async run(files: FileInput[]): Promise<ScanResult> {
    const startTime = Date.now();
    const vulnerabilities: Vulnerability[] = [];

    // Filter to only supported file types
    const scannable = files.filter((f) =>
      SUPPORTED_EXTENSIONS.includes(getExtension(f.filename))
    );

    for (const file of scannable) {
      const ext = getExtension(file.filename);
      const content = file.content;

      for (const pattern of SAST_PATTERNS) {
        // Skip if this pattern doesn't apply to this language
        if (!pattern.languages.includes(ext)) continue;

        // Reset regex state (important for global flags)
        pattern.regex.lastIndex = 0;

        let match: RegExpExecArray | null;
        while ((match = pattern.regex.exec(content)) !== null) {
          const lineNumber = getLineNumber(content, match.index);
          const snippet = getCodeSnippet(content, lineNumber);

          vulnerabilities.push({
            engine: "sast",
            severity: pattern.severity,
            title: pattern.title,
            description: pattern.description,
            filePath: file.filename,
            lineNumber,
            codeSnippet: snippet,
            fixSuggestion: pattern.fixSuggestion,
            cweId: pattern.cweId,
          });
        }
      }
    }

    return {
      engine: "sast",
      vulnerabilities,
      scanDurationMs: Date.now() - startTime,
      filesScanned: scannable.length,
    };
  },
};
