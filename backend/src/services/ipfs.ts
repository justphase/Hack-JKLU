/**
 * IPFS Service — Upload scan reports to IPFS via Pinata HTTP API
 *
 * Uses Pinata's REST API directly for maximum compatibility.
 */

const PINATA_API = "https://api.pinata.cloud";

/**
 * Upload a scan result to IPFS via Pinata
 * @returns The IPFS CID (Content Identifier)
 */
export async function uploadToIPFS(scanResult: Record<string, unknown>): Promise<string> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("PINATA_JWT not configured");

  try {
    const res = await fetch(`${PINATA_API}/pinning/pinJSONToIPFS`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        pinataContent: scanResult,
        pinataMetadata: {
          name: `oracle-decree-scan-${(scanResult.scanId as string)?.slice(0, 8) || "unknown"}`,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Pinata API error ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as { IpfsHash: string };
    console.log(`[IPFS] Uploaded scan to IPFS: ${data.IpfsHash}`);
    return data.IpfsHash;
  } catch (err) {
    console.error("[IPFS] Upload failed:", err);
    throw new Error(`IPFS upload failed: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}

/**
 * Get IPFS gateway URL for a CID
 */
export function getIPFSUrl(cid: string): string {
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

/**
 * Fetch a scan report from IPFS
 */
export async function fetchFromIPFS(cid: string): Promise<Record<string, unknown>> {
  const url = getIPFSUrl(cid);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch from IPFS: ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}
