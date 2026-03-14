import "dotenv/config";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { scaEngine } from "../scaEngine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const content = readFileSync(join(__dirname, "vulnerable-package.json"), "utf-8");

console.log("📦 Running SCA Engine on vulnerable-package.json...\n");
const start = Date.now();

const result = await scaEngine.run([
  { filename: "package.json", content },
]);

const elapsed = Date.now() - start;
console.log(`✅ Done in ${elapsed}ms!`);
console.log(`⚠️  Found ${result.vulnerabilities.length} vulnerable package(s)\n`);

const bySev: Record<string, number> = {};
for (const v of result.vulnerabilities) {
  bySev[v.severity] = (bySev[v.severity] ?? 0) + 1;
}
console.log("Severity breakdown:", bySev, "\n");

for (const v of result.vulnerabilities) {
  const emoji = { critical: "🔴", high: "🟠", medium: "🟡", low: "🟢", info: "⚪" }[v.severity] ?? "•";
  console.log(`${emoji} [${v.severity.toUpperCase()}] ${v.title}`);
  console.log(`   🔗 ${v.cweId}`);
  console.log(`   💡 ${v.fixSuggestion}\n`);
}
