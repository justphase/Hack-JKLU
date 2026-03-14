/**
 * Verify Route — Check scan integrity via blockchain + IPFS
 *
 * GET /verify/:scanId → fetches on-chain record, IPFS report, compares hashes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { verifyOnChain, hashScanResult, getExplorerUrl } from "../services/blockchain.js";
import { fetchFromIPFS, getIPFSUrl } from "../services/ipfs.js";

export async function verifyRoutes(server: FastifyInstance) {
  server.get("/verify/:scanId", async (request: FastifyRequest<{ Params: { scanId: string } }>, reply: FastifyReply) => {
    const { scanId } = request.params;

    try {
      // 1. Get on-chain record
      const onChain = await verifyOnChain(scanId);

      if (!onChain) {
        return reply.send({
          verified: false,
          scanId,
          message: "Scan not found on blockchain. It may not have been recorded on-chain.",
        });
      }

      // 2. Fetch from IPFS
      let ipfsData: Record<string, unknown> | null = null;
      let ipfsHash: string | null = null;

      try {
        ipfsData = await fetchFromIPFS(onChain.ipfsCid);
        ipfsHash = hashScanResult(ipfsData);
      } catch {
        return reply.send({
          verified: false,
          scanId,
          onChain: {
            ipfsCid: onChain.ipfsCid,
            contentHash: onChain.contentHash,
            timestamp: new Date(onChain.timestamp * 1000).toISOString(),
            scanner: onChain.scanner,
          },
          message: "On-chain record found but IPFS data could not be fetched.",
          ipfsUrl: getIPFSUrl(onChain.ipfsCid),
        });
      }

      // 3. Compare hashes
      const hashMatch = ipfsHash === onChain.contentHash;

      return reply.send({
        verified: hashMatch,
        scanId,
        integrityStatus: hashMatch ? "✅ VERIFIED — Report is authentic and untampered" : "❌ MISMATCH — Report may have been tampered with",
        onChain: {
          ipfsCid: onChain.ipfsCid,
          contentHash: onChain.contentHash,
          timestamp: new Date(onChain.timestamp * 1000).toISOString(),
          scanner: onChain.scanner,
        },
        computed: {
          ipfsHash,
          hashMatch,
        },
        links: {
          ipfsUrl: getIPFSUrl(onChain.ipfsCid),
        },
        scanData: hashMatch ? ipfsData : undefined,
      });
    } catch (err) {
      return reply.status(500).send({
        error: "Verification failed",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });
}
