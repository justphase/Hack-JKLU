// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ScanRegistry
 * @dev Records security scan hashes on-chain for tamper-proof verification.
 *      Each scan stores its IPFS CID and content hash so anyone can verify
 *      that a report hasn't been modified.
 */
contract ScanRegistry {
    struct ScanRecord {
        string ipfsCid;        // IPFS Content Identifier
        bytes32 contentHash;   // SHA-256 hash of the scan result
        uint256 timestamp;     // Block timestamp when recorded
        address scanner;       // Address of who submitted the scan
        bool exists;
    }

    mapping(string => ScanRecord) public scans; // scanId => ScanRecord
    string[] public scanIds;                     // list of all scan IDs

    event ScanRecorded(
        string indexed scanId,
        string ipfsCid,
        bytes32 contentHash,
        address scanner,
        uint256 timestamp
    );

    /**
     * @dev Record a new scan on-chain
     * @param scanId Unique scan identifier
     * @param ipfsCid IPFS CID where full report is stored
     * @param contentHash SHA-256 hash of the scan result JSON
     */
    function recordScan(
        string calldata scanId,
        string calldata ipfsCid,
        bytes32 contentHash
    ) external {
        require(!scans[scanId].exists, "Scan already recorded");
        require(bytes(ipfsCid).length > 0, "IPFS CID required");

        scans[scanId] = ScanRecord({
            ipfsCid: ipfsCid,
            contentHash: contentHash,
            timestamp: block.timestamp,
            scanner: msg.sender,
            exists: true
        });

        scanIds.push(scanId);

        emit ScanRecorded(scanId, ipfsCid, contentHash, msg.sender, block.timestamp);
    }

    /**
     * @dev Verify a scan exists and return its data
     */
    function verifyScan(string calldata scanId)
        external
        view
        returns (string memory ipfsCid, bytes32 contentHash, uint256 timestamp, address scanner)
    {
        require(scans[scanId].exists, "Scan not found");
        ScanRecord memory record = scans[scanId];
        return (record.ipfsCid, record.contentHash, record.timestamp, record.scanner);
    }

    /**
     * @dev Get total number of recorded scans
     */
    function totalScans() external view returns (uint256) {
        return scanIds.length;
    }
}
