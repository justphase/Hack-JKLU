import "dotenv/config";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { secretsEngine } from "../secretsEngine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const content = readFileSync(join(__dirname, "vulnerable-secrets.env"), "utf-8");

console.log("🔑 Running Secret Guardian on vulnerable-secrets.env...\n");
const result = await secretsEngine.run([
  { filename: "vulnerable-secrets.env", content },
]);

const bySev: Record<string, number> = {};
for (const v of result.vulnerabilities) {
  bySev[v.severity] = (bySev[v.severity] ?? 0) + 1;
}

console.log(`✅ Done in ${result.scanDurationMs}ms`);
console.log(`⚠️  Found ${result.vulnerabilities.length} secrets\n`);
console.log("Severity breakdown:", bySev, "\n");

for (const v of result.vulnerabilities) {
  const emojis: Record<string, string> = { critical: "🔴", high: "🟠", medium: "🟡", low: "🟢", info: "⚪" };
  const emoji = emojis[v.severity] ?? "•";
  console.log(`${emoji} [${v.severity.toUpperCase()}] ${v.title}`);
  console.log(`   📍 Line ${v.lineNumber} → ${v.codeSnippet}`);
}
