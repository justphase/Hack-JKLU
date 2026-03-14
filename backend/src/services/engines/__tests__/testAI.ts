import "dotenv/config";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { runWithAI, calculateRiskScore } from "../index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const content = readFileSync(join(__dirname, "vulnerable-fixture.js"), "utf-8");

console.log("🔍 Running SAST + AI (Gemini) deep scan on vulnerable-fixture.js...\n");

const results = await runWithAI([
  { filename: "vulnerable-fixture.js", content },
]);

const riskScore = calculateRiskScore(results);
const allVulns = results.flatMap((r) => r.vulnerabilities);

console.log(`✅ Done! Risk Score: ${riskScore}/100`);
console.log(`⚠️  Total findings: ${allVulns.length}\n`);

for (const result of results) {
  const emoji = result.engine === "ai" ? "🤖" : "🔍";
  console.log(`${emoji} [${result.engine.toUpperCase()}] — ${result.vulnerabilities.length} finding(s) in ${result.scanDurationMs}ms`);
  if (result.error) console.log(`   ⚠️  Error: ${result.error}`);
  for (const v of result.vulnerabilities) {
    const sev = { critical: "🔴", high: "🟠", medium: "🟡", low: "🟢", info: "⚪" }[v.severity] ?? "•";
    console.log(`   ${sev} [${v.severity}] ${v.title} — ${v.filePath}:${v.lineNumber}`);
  }
  console.log();
}
