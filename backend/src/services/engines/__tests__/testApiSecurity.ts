import "dotenv/config";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { apiSecurityEngine } from "../apiSecurityEngine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const content = readFileSync(join(__dirname, "openapi.json"), "utf-8");

console.log("🔒 Running API Security Engine on vulnerable openapi.json...\n");
const result = await apiSecurityEngine.run([
  { filename: "openapi.json", content },
]);

console.log(`✅ Done in ${result.scanDurationMs}ms`);
console.log(`⚠️  Found ${result.vulnerabilities.length} API security issues\n`);

const bySev: Record<string, number> = {};
for (const v of result.vulnerabilities) {
  bySev[v.severity] = (bySev[v.severity] ?? 0) + 1;
}
console.log("Severity breakdown:", bySev, "\n");

for (const v of result.vulnerabilities) {
  const emoji = { critical: "🔴", high: "🟠", medium: "🟡", low: "🟢", info: "⚪" }[v.severity] ?? "•";
  console.log(`${emoji} [${v.severity.toUpperCase()}] ${v.title}`);
  console.log(`   ${v.description.slice(0, 100)}`);
  console.log(`   💡 ${v.fixSuggestion.slice(0, 100)}\n`);
}
