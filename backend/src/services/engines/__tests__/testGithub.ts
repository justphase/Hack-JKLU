import "dotenv/config";

console.log("🔗 Testing GitHub repo scan (small repo)...\n");
const start = Date.now();

const res = await fetch("http://localhost:3002/api/scan/github", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ repositoryUrl: "https://github.com/expressjs/cors" }),
});

const data = await res.json();
const elapsed = ((Date.now() - start) / 1000).toFixed(1);

console.log(`✅ Done in ${elapsed}s`);
console.log(`Status: ${data.status}`);
console.log(`Repo: ${data.repository} (${data.branch})`);
console.log(`Files scanned: ${data.filesScanned}`);
console.log(`Total vulns: ${data.totalVulnerabilities}`);
console.log(`Risk Score: ${data.riskScore}/100\n`);

console.log("Engine breakdown:");
for (const e of data.engineSummaries ?? []) {
  console.log(`  ${e.engine}: ${e.vulnerabilities} findings (${e.durationMs}ms, ${e.filesScanned} files)`);
  if (e.error) console.log(`    ⚠️ ${e.error}`);
}
