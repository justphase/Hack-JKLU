/**
 * Blockchain Service — Record & verify scan hashes on Polygon
 *
 * Uses ethers.js to interact with the ScanRegistry smart contract
 * on Polygon Amoy testnet (or mainnet).
 */

import { ethers } from "ethers";
import crypto from "crypto";

// ABI for ScanRegistry contract (only the functions we use)
const SCAN_REGISTRY_ABI = [
  "function recordScan(string scanId, string ipfsCid, bytes32 contentHash) external",
  "function verifyScan(string scanId) external view returns (string ipfsCid, bytes32 contentHash, uint256 timestamp, address scanner)",
  "function totalScans() external view returns (uint256)",
  "event ScanRecorded(string indexed scanId, string ipfsCid, bytes32 contentHash, address scanner, uint256 timestamp)",
];

let provider: ethers.JsonRpcProvider | null = null;
let signer: ethers.Wallet | null = null;
let contract: ethers.Contract | null = null;

function getContract(): ethers.Contract {
  if (!contract) {
    const rpcUrl = process.env.POLYGON_RPC_URL || "https://rpc-amoy.polygon.technology";
    const privateKey = process.env.WALLET_PRIVATE_KEY;
    const contractAddr = process.env.SCAN_REGISTRY_ADDRESS;

    if (!privateKey) throw new Error("WALLET_PRIVATE_KEY not configured");
    if (!contractAddr) throw new Error("SCAN_REGISTRY_ADDRESS not configured");

    provider = new ethers.JsonRpcProvider(rpcUrl);
    signer = new ethers.Wallet(privateKey, provider);
    contract = new ethers.Contract(contractAddr, SCAN_REGISTRY_ABI, signer);
  }
  return contract;
}

/**
 * Generate SHA-256 hash of scan result
 */
export function hashScanResult(scanResult: Record<string, unknown>): string {
  const json = JSON.stringify(scanResult, Object.keys(scanResult).sort());
  return "0x" + crypto.createHash("sha256").update(json).digest("hex");
}

/**
 * Record a scan on the blockchain
 * @returns Transaction hash
 */
export async function recordOnChain(
  scanId: string,
  ipfsCid: string,
  contentHash: string
): Promise<{ txHash: string; blockNumber: number }> {
  try {
    const registry = getContract();

    console.log(`[Blockchain] Recording scan ${scanId} on-chain...`);
    const tx = await registry.recordScan(scanId, ipfsCid, contentHash);
    const receipt = await tx.wait();

    console.log(`[Blockchain] Scan recorded! TX: ${receipt.hash}, Block: ${receipt.blockNumber}`);
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  } catch (err) {
    console.error("[Blockchain] Record failed:", err);
    throw new Error(`Blockchain record failed: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}

/**
 * Verify a scan from the blockchain
 */
export async function verifyOnChain(scanId: string): Promise<{
  ipfsCid: string;
  contentHash: string;
  timestamp: number;
  scanner: string;
} | null> {
  try {
    const registry = getContract();
    const [ipfsCid, contentHash, timestamp, scanner] = await registry.verifyScan(scanId);

    return {
      ipfsCid,
      contentHash,
      timestamp: Number(timestamp),
      scanner,
    };
  } catch {
    return null; // Scan not found on-chain
  }
}

/**
 * Get the explorer URL for a transaction
 */
export function getExplorerUrl(txHash: string): string {
  // Amoy testnet explorer
  return `https://amoy.polygonscan.com/tx/${txHash}`;
}

/**
 * Get wallet address of the signer
 */
export function getWalletAddress(): string | null {
  try {
    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (!privateKey) return null;
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address;
  } catch {
    return null;
  }
}
