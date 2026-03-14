import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Engine, FileInput, ScanResult, Vulnerability } from "./types.js";

const MODEL = "gemini-2.0-flash";

// Chunk large files to stay within token limits
const MAX_CHARS_PER_FILE = 8000;

function chunkFile(content: string): string {
  if (content.length <= MAX_CHARS_PER_FILE) return content;
  return content.slice(0, MAX_CHARS_PER_FILE) + "\n\n[... file truncated for analysis ...]";
}

const SYSTEM_PROMPT = `You are an expert security code reviewer and secrets detection specialist. Analyze the provided source code for BOTH security vulnerabilities AND hardcoded secrets/credentials.

For each vulnerability or exposed secret found, return a JSON object in this exact structure:
{
  "vulnerabilities": [
    {
      "title": "Short descriptive title",
      "severity": "critical|high|medium|low|info",
      "description": "Clear explanation of the vulnerability and why it matters",
      "filePath": "<filename>",
      "lineNumber": <approximate line number>,
      "codeSnippet": "<the vulnerable line(s) of code>",
      "fixSuggestion": "Specific, actionable fix for this exact code",
      "cweId": "CWE-<number>"
    }
  ]
}

## CODE VULNERABILITY DETECTION:
Focus on: injection (SQL, NoSQL, command, LDAP), XSS (reflected, stored, DOM), insecure crypto, auth bypass, SSRF, path traversal, race conditions, insecure deserialization, prototype pollution, open redirects, CORS misconfigurations, IDOR, mass assignment.

## SECRET & CREDENTIAL DETECTION (CRITICAL):
Actively hunt for ANY hardcoded secrets, including but not limited to:
- API keys (AWS, GCP, Azure, OpenAI, Stripe, SendGrid, Twilio, etc.)
- OAuth tokens, Personal Access Tokens (GitHub, GitLab, Bitbucket)
- Database connection strings with embedded passwords
- Private keys (RSA, SSH, PGP, TLS certificates)
- JWT signing secrets
- Webhook URLs (Slack, Discord, etc.)
- Base64-encoded credentials or secrets
- Secrets disguised in comments or documentation
- Environment variables with hardcoded values that look like real credentials
- Any long, high-entropy string assigned to security-related variable names

For secrets: Mark severity as "critical" if it is a live-looking credential. Include "Hardcoded Secret:" prefix in the title.

Rules:
- Only report REAL vulnerabilities and genuine secrets, not style issues
- Be specific about line numbers
- The codeSnippet MUST be actual code from the file
- Return ONLY valid JSON, no markdown, no explanation outside the JSON
- If no vulnerabilities found, return: {"vulnerabilities": []}`;

async function analyzeFile(
  genAI: GoogleGenerativeAI,
  file: FileInput
): Promise<Vulnerability[]> {
  const model = genAI.getGenerativeModel({ model: MODEL });

  const prompt = `${SYSTEM_PROMPT}

File: ${file.filename}
\`\`\`
${chunkFile(file.content)}
\`\`\``;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip markdown code fences if Gemini wraps response
    const jsonText = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const parsed = JSON.parse(jsonText);
    const vulns: Vulnerability[] = (parsed.vulnerabilities ?? []).map(
      (v: Record<string, unknown>) => ({
        engine: "ai",
        title: String(v.title ?? "Unknown"),
        severity: String(v.severity ?? "medium"),
        description: String(v.description ?? ""),
        filePath: String(v.filePath ?? file.filename),
        lineNumber: Number(v.lineNumber ?? 0),
        codeSnippet: String(v.codeSnippet ?? ""),
        fixSuggestion: String(v.fixSuggestion ?? ""),
        cweId: String(v.cweId ?? ""),
      })
    );
    return vulns;
  } catch (err) {
    console.error(`[AI Engine] Failed to parse Gemini response for ${file.filename}:`, err);
    return [];
  }
}

export const aiEngine: Engine = {
  name: "ai",
  supportedExtensions: ["*"], // AI can analyse any text-based file

  async run(files: FileInput[]): Promise<ScanResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        engine: "ai",
        vulnerabilities: [],
        filesScanned: 0,
        scanDurationMs: 0,
        error: "GEMINI_API_KEY not set",
      };
    }

    const start = Date.now();
    const genAI = new GoogleGenerativeAI(apiKey);

    // Analyse files in parallel (max 3 at a time to avoid rate limits)
    const BATCH = 3;
    const allVulns: Vulnerability[] = [];

    for (let i = 0; i < files.length; i += BATCH) {
      const batch = files.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map((f) => analyzeFile(genAI, f))
      );
      results.forEach((vulns) => allVulns.push(...vulns));
    }

    return {
      engine: "ai",
      vulnerabilities: allVulns,
      filesScanned: files.length,
      scanDurationMs: Date.now() - start,
    };
  },
};
