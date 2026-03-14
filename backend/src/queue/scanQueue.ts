import { Queue } from "bullmq";
import { getRedisConnection } from "./redisConnection.js";

export interface ScanJobData {
  scanId: string;
  files?: { filename: string; content: string }[];
  repositoryUrl?: string;
  engines: string[] | { filename: string; engines: string[] }[];
  sourceType: "upload" | "github";
}

let scanQueue: Queue<ScanJobData> | null = null;

export function getScanQueue(): Queue<ScanJobData> {
  if (!scanQueue) {
    scanQueue = new Queue<ScanJobData>("scan-jobs", {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    });
  }
  return scanQueue;
}

export async function addScanJob(data: ScanJobData): Promise<string> {
  const queue = getScanQueue();
  const job = await queue.add(`scan-${data.scanId}`, data, {
    priority: 1,
  });
  console.log(`📋 Scan job queued: ${job.id} for scan ${data.scanId}`);
  return job.id!;
}
