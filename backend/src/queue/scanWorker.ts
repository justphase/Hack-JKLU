import { Worker, Job } from "bullmq";
import { getRedisConnection } from "./redisConnection.js";
import type { ScanJobData } from "./scanQueue.js";
import { runAllEngines, calculateRiskScore } from "../services/engines/index.js";
import type { FileInput, ScanResult } from "../services/engines/types.js";

export function startScanWorker(): Worker<ScanJobData> {
  const worker = new Worker<ScanJobData>(
    "scan-jobs",
    async (job: Job<ScanJobData>) => {
      const { scanId, sourceType, files } = job.data;

      console.log(`\n🔍 ═══════════════════════════════════════`);
      console.log(`   Scan started: ${scanId}`);
      console.log(`   Source: ${sourceType}`);
      console.log(`   Files: ${files?.length ?? 0}`);
      console.log(`🔍 ═══════════════════════════════════════\n`);

      await job.updateProgress(10);

      // Decode base64 file content into FileInput[]
      const fileInputs: FileInput[] = (files ?? []).map((f) => ({
        filename: f.filename,
        content: Buffer.from(f.content, "base64").toString("utf-8"),
      }));

      await job.updateProgress(20);
      console.log(`   ⚙️  Running engines on ${fileInputs.length} file(s)...`);

      // Run all available engines in parallel
      const results: ScanResult[] = await runAllEngines(fileInputs);

      await job.updateProgress(80);

      // Aggregate results
      const allVulnerabilities = results.flatMap((r) => r.vulnerabilities);
      const riskScore = calculateRiskScore(results);
      const totalFilesScanned = results.reduce((sum, r) => sum + r.filesScanned, 0);

      // Engine summaries
      const engineSummaries = results.map((r) => ({
        engine: r.engine,
        vulnerabilities: r.vulnerabilities.length,
        filesScanned: r.filesScanned,
        durationMs: r.scanDurationMs,
        error: r.error,
      }));

      console.log(`\n✅ Scan complete: ${scanId}`);
      console.log(`   Risk Score: ${riskScore}/100`);
      console.log(`   Total Vulnerabilities: ${allVulnerabilities.length}`);
      engineSummaries.forEach((s) => {
        if (s.error) {
          console.log(`   ⚠️  ${s.engine}: ${s.error}`);
        } else {
          console.log(`   🔍 ${s.engine}: ${s.vulnerabilities} vuln(s) in ${s.filesScanned} file(s) — ${s.durationMs}ms`);
        }
      });
      console.log();

      await job.updateProgress(100);

      return {
        scanId,
        status: "completed",
        riskScore,
        totalVulnerabilities: allVulnerabilities.length,
        vulnerabilities: allVulnerabilities,
        engineSummaries,
        completedAt: new Date().toISOString(),
      };
    },
    {
      connection: getRedisConnection() as any,
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 60000,
      },
    }
  );

  worker.on("completed", (job) => {
    console.log(`✅ Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message);
  });

  worker.on("progress", (job, progress) => {
    console.log(`📊 Job ${job.id}: ${progress}%`);
  });

  console.log("🔮 Scan worker started — real engines active");
  return worker;
}
