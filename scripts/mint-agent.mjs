#!/usr/bin/env node
/**
 * Mint a SekaiAgent on 0G Mainnet after deploy.
 * Requires: SEKAI_AGENT_ADDRESS, DEPLOYER_PRIVATE_KEY (minter), OG_RPC_URL
 */
import { createWalletClient, createPublicClient, http, keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "node:fs";

const rpc = process.env.OG_RPC_URL ?? "https://evmrpc.0g.ai";
const agentAddress = process.env.SEKAI_AGENT_ADDRESS;
const key = process.env.DEPLOYER_PRIVATE_KEY;

if (!agentAddress || !key) {
  console.error("Set SEKAI_AGENT_ADDRESS and DEPLOYER_PRIVATE_KEY");
  process.exit(2);
}

const abi = JSON.parse(
  readFileSync(new URL("../deployments/mainnet/SekaiAgent.json", import.meta.url), "utf8"),
).abi;

const account = privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`);
const chain = {
  id: 16661,
  name: "0G Mainnet",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: { default: { http: [rpc] } },
};

const wallet = createWalletClient({ account, chain, transport: http(rpc) });
const publicClient = createPublicClient({ chain, transport: http(rpc) });

const encryptedURI = process.env.AGENT_ENCRYPTED_URI ?? "0g://pending-upload";
const metadataHash = keccak256(toBytes(process.env.AGENT_META ?? "sekaigent-agent-v1"));

const hash = await wallet.writeContract({
  address: agentAddress,
  abi,
  functionName: "mint",
  args: [account.address, encryptedURI, metadataHash],
});
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log(JSON.stringify({ txHash: hash, blockNumber: receipt.blockNumber.toString() }, null, 2));
