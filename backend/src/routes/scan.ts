import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { runWithAI, calculateRiskScore } from "../services/engines/index.js";
import type { FileInput } from "../services/engines/types.js";
import { downloadRepo, cleanupTempDir } from "../services/github/cloneRepo.js";
import { uploadToIPFS, getIPFSUrl } from "../services/ipfs.js";
import { recordOnChain, hashScanResult, getExplorerUrl } from "../services/blockchain.js";

interface ScanBody {
  repositoryUrl?: string;
  githubToken?: string;
}

export async function scanRoutes(server: FastifyInstance) {

  // ─── File Upload Scan ─────────────────────────────────────────────────────
  server.post("/scan/upload", async (request: FastifyRequest, reply: FastifyReply) => {
    const parts = request.files();
    const fileInputs: FileInput[] = [];

    for await (const part of parts) {
      const buffer = await part.toBuffer();
      fileInputs.push({
        filename: part.filename,
        content: buffer.toString("utf-8"),
      });
    }

    if (fileInputs.length === 0) {
      return reply.status(400).send({ error: "No files uploaded" });
    }

    const scanId = crypto.randomUUID();

    try {
      const results = await runWithAI(fileInputs);
      const allVulnerabilities = results.flatMap((r) => r.vulnerabilities);
      const riskScore = calculateRiskScore(results);

      const engineSummaries = results.map((r) => ({
        engine: r.engine,
        vulnerabilities: r.vulnerabilities.length,
        filesScanned: r.filesScanned,
        durationMs: r.scanDurationMs,
        error: r.error,
      }));

      const response: Record<string, unknown> = {
        scanId,
        status: "completed",
        mode: "sast+ai",
        riskScore,
        totalVulnerabilities: allVulnerabilities.length,
        vulnerabilities: allVulnerabilities,
        engineSummaries,
        completedAt: new Date().toISOString(),
      };

      // ── Decentralized storage (non-blocking, graceful) ──
      try {
        const ipfsCid = await uploadToIPFS(response);
        const contentHash = hashScanResult(response);
        const { txHash } = await recordOnChain(scanId, ipfsCid, contentHash);
        response.ipfsCid = ipfsCid;
        response.ipfsUrl = getIPFSUrl(ipfsCid);
        response.txHash = txHash;
        response.explorerUrl = getExplorerUrl(txHash);
        response.contentHash = contentHash;
      } catch (err) {
        console.warn("[Decentralized] Skipped:", err instanceof Error ? err.message : err);
      }

      return reply.send(response);
    } catch (err) {
      return reply.status(500).send({
        error: "Scan failed",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // ─── GitHub Repo Scan ─────────────────────────────────────────────────────
  server.post("/scan/github", async (request: FastifyRequest<{ Body: ScanBody }>, reply: FastifyReply) => {
    const { repositoryUrl } = request.body;

    if (!repositoryUrl) {
      return reply.status(400).send({ error: "repositoryUrl is required" });
    }

    if (!repositoryUrl.match(/^https?:\/\/(www\.)?github\.com\/.+\/.+/)) {
      return reply.status(400).send({ error: "Invalid GitHub repository URL" });
    }

    const scanId = crypto.randomUUID();
    const githubToken = request.body.githubToken;
    let tempDir: string | undefined;

    try {
      // 1. Download and extract the repo
      const { files, repoInfo, tempDir: td } = await downloadRepo(repositoryUrl, githubToken);
      tempDir = td;

      if (files.length === 0) {
        cleanupTempDir(tempDir);
        return reply.status(400).send({ error: "No scannable files found in repository" });
      }

      // 2. Run all engines on the extracted files
      const results = await runWithAI(files);
      const allVulnerabilities = results.flatMap((r) => r.vulnerabilities);
      const riskScore = calculateRiskScore(results);

      const engineSummaries = results.map((r) => ({
        engine: r.engine,
        vulnerabilities: r.vulnerabilities.length,
        filesScanned: r.filesScanned,
        durationMs: r.scanDurationMs,
        error: r.error,
      }));

      // 3. Clean up temp directory
      cleanupTempDir(tempDir);

      const response: Record<string, unknown> = {
        scanId,
        status: "completed",
        mode: "sast+ai",
        source: "github",
        repository: `${repoInfo.owner}/${repoInfo.repo}`,
        branch: repoInfo.branch,
        filesScanned: files.length,
        riskScore,
        totalVulnerabilities: allVulnerabilities.length,
        vulnerabilities: allVulnerabilities,
        engineSummaries,
        completedAt: new Date().toISOString(),
      };

      // ── Decentralized storage (non-blocking, graceful) ──
      try {
        const ipfsCid = await uploadToIPFS(response);
        const contentHash = hashScanResult(response);
        const { txHash } = await recordOnChain(scanId, ipfsCid, contentHash);
        response.ipfsCid = ipfsCid;
        response.ipfsUrl = getIPFSUrl(ipfsCid);
        response.txHash = txHash;
        response.explorerUrl = getExplorerUrl(txHash);
        response.contentHash = contentHash;
      } catch (err) {
        console.warn("[Decentralized] Skipped:", err instanceof Error ? err.message : err);
      }

      return reply.send(response);
    } catch (err) {
      if (tempDir) cleanupTempDir(tempDir);
      return reply.status(500).send({
        error: "GitHub scan failed",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // ─── Scan Status ──────────────────────────────────────────────────────────
  server.get("/scan/:scanId", async (request: FastifyRequest<{ Params: { scanId: string } }>, reply: FastifyReply) => {
    const { scanId } = request.params;
    return reply.send({ scanId, status: "pending" });
  });
}
