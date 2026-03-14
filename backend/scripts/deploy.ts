import fs from "fs";
import path from "path";
import solc from "solc";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env") });

async function main() {
  const privateKey = process.env.WALLET_PRIVATE_KEY;
  const rpcUrl = process.env.POLYGON_RPC_URL || "https://rpc-amoy.polygon.technology";

  if (!privateKey) {
    throw new Error("Missing WALLET_PRIVATE_KEY in .env");
  }

  console.log("Compiling ScanRegistry.sol...");
  const contractPath = path.join(process.cwd(), "contracts", "ScanRegistry.sol");
  const source = fs.readFileSync(contractPath, "utf8");

  const input = {
    language: "Solidity",
    sources: {
      "ScanRegistry.sol": {
        content: source,
      },
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };

  const compiled = JSON.parse(solc.compile(JSON.stringify(input)));

  if (compiled.errors) {
    const hasErrors = compiled.errors.some((err: any) => err.severity === "error");
    if (hasErrors) {
      console.error("Compilation failed:", compiled.errors);
      process.exit(1);
    } else {
      console.warn("Compilation warnings:", compiled.errors);
    }
  }

  const contractData = compiled.contracts["ScanRegistry.sol"]["ScanRegistry"];
  const abi = contractData.abi;
  const bytecode = contractData.evm.bytecode.object;

  console.log("Connecting to Polygon Amoy...");
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`Deploying from account: ${wallet.address}`);
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);

  console.log("Deploying contract...");
  const contract = await factory.deploy();
  console.log("Waiting for deployment confirmation...");
  
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  
  console.log(`ScanRegistry deployed to: ${address}`);
  console.log(`Explorer link: https://amoy.polygonscan.com/address/${address}`);
  
  // Update .env with the new address
  const envPath = path.join(process.cwd(), ".env");
  let envContent = fs.readFileSync(envPath, "utf8");
  envContent = envContent.replace(
    /SCAN_REGISTRY_ADDRESS=.*/,
    `SCAN_REGISTRY_ADDRESS=${address}`
  );
  fs.writeFileSync(envPath, envContent);
  console.log("Updated SCAN_REGISTRY_ADDRESS in .env");
}

main().catch((err) => {
  console.error("Error during deployment:", err);
  process.exit(1);
});
