import "dotenv/config";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { secretsEngine } from "../secretsEngine.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __dirname = dirname(fileURLToPath(import.meta.url));
const content = readFileSync(join(__dirname, "vulnerable-secrets.env"), "utf-8");

// ── Step 1: Regex-based Secret Guardian ──
console.log("🔑 [REGEX] Running Secret Guardian regex patterns...");
const regexResult = await secretsEngine.run([{ filename: ".env", content }]);
console.log(`   Found ${regexResult.vulnerabilities.length} secrets in ${regexResult.scanDurationMs}ms\n`);

// ── Step 2: AI-based Secret Detection ──
console.log("🤖 [AI] Running Gemini AI secret detection...");
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) { console.log("   ⚠️ GEMINI_API_KEY not set"); process.exit(1); }

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const prompt = `You are a secrets detection specialist. Find ALL hardcoded secrets, API keys, tokens, passwords, and credentials in this file. Return ONLY valid JSON in this format:
{"secrets":[{"title":"...","line":1,"severity":"critical"}]}

File: .env
\`\`\`
${content}
\`\`\``;

const result = await model.generateContent(prompt);
const text = result.response.text().trim()
  .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
const parsed = JSON.parse(text);

console.log(`   Found ${parsed.secrets?.length ?? 0} secrets via AI\n`);

// ── Compare ──
console.log("=== COMPARISON ===");
console.log(`🔑 Regex patterns: ${regexResult.vulnerabilities.length} secrets`);
console.log(`🤖 Gemini AI:      ${parsed.secrets?.length ?? 0} secrets`);
console.log(`\n🤖 AI findings:`);
for (const s of parsed.secrets ?? []) {
  const emoji = s.severity === "critical" ? "🔴" : s.severity === "high" ? "🟠" : "🟡";
  console.log(`  ${emoji} [${s.severity?.toUpperCase()}] ${s.title} (line ${s.line})`);
}
