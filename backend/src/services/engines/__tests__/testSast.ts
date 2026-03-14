/**
 * Quick SAST engine test — run with: npx tsx src/services/engines/__tests__/testSast.ts
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { sastEngine } from "../sastEngine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const fixtureContent = readFileSync(
  join(__dirname, "vulnerable-fixture.js"),
  "utf-8"
);

console.log("🔍 Running SAST engine against vulnerable-fixture.js...\n");

const result = await sastEngine.run([
  { filename: "vulnerable-fixture.js", content: fixtureContent },
]);

console.log(`✅ Scan complete in ${result.scanDurationMs}ms`);
console.log(`📁 Files scanned: ${result.filesScanned}`);
console.log(`⚠️  Vulnerabilities found: ${result.vulnerabilities.length}\n`);

// Group by severity
const bySeverity = result.vulnerabilities.reduce(
  (acc, v) => {
    acc[v.severity] = (acc[v.severity] || 0) + 1;
    return acc;
  },
  {} as Record<string, number>
);

console.log("📊 Severity breakdown:");
for (const [sev, count] of Object.entries(bySeverity)) {
  const emoji = { critical: "🔴", high: "🟠", medium: "🟡", low: "🟢", info: "⚪" }[sev] || "•";
  console.log(`   ${emoji} ${sev.padEnd(10)} ${count}`);
}

console.log("\n📋 Findings:");
for (const vuln of result.vulnerabilities) {
  const emoji = { critical: "🔴", high: "🟠", medium: "🟡", low: "🟢", info: "⚪" }[vuln.severity] || "•";
  console.log(`\n  ${emoji} [${vuln.severity.toUpperCase()}] ${vuln.title} (${vuln.cweId})`);
  console.log(`     File: ${vuln.filePath}:${vuln.lineNumber}`);
  console.log(`     Fix: ${vuln.fixSuggestion}`);
}
