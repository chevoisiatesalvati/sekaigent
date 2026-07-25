#!/usr/bin/env node
/**
 * Re-seal a v1 agent package to 0G Storage and point an existing SekaiAgent
 * token at it via updateMetadata (DEFAULT_ADMIN_ROLE).
 *
 * Usage:
 *   TOKEN_ID=1 NAME="Ada Vale" CODENAME=NIGHTJAR ARCHETYPE=Infiltrator \
 *     PORTRAIT_ID=inf-01 node scripts/backfill-agent-package.mjs
 *
 * Requires: DEPLOYER_PRIVATE_KEY or ADMIN_PRIVATE_KEY (admin on SekaiAgent),
 * STORAGE_PRIVATE_KEY or DEPLOYER (funded for upload), SEKAI_AGENT_ADDRESS,
 * AGENT_SEAL_PASSWORD (must match API).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import {
  createWalletClient,
  createPublicClient,
  http,
  keccak256,
  stringToHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { OgStorageClient } from "@sekaigent/sdk";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(resolve(root, ".env"))) loadEnv({ path: resolve(root, ".env") });

const tokenId = process.env.TOKEN_ID;
const name = process.env.NAME;
const codename = process.env.CODENAME;
if (!tokenId || !name || !codename) {
  console.error("Set TOKEN_ID, NAME, CODENAME");
  process.exit(2);
}

const adminKey = (
  process.env.ADMIN_PRIVATE_KEY ||
  process.env.DEPLOYER_PRIVATE_KEY ||
  ""
).trim();
const storageKey = (
  process.env.STORAGE_PRIVATE_KEY ||
  process.env.DEPLOYER_PRIVATE_KEY ||
  ""
).trim();
const agentAddress = process.env.SEKAI_AGENT_ADDRESS;
const rpc = process.env.OG_RPC_URL || "https://evmrpc.0g.ai";
const password = process.env.AGENT_SEAL_PASSWORD || "sekaigent-dev-seal";

if (!adminKey || !storageKey || !agentAddress) {
  console.error("Need ADMIN/DEPLOYER key, storage key, SEKAI_AGENT_ADDRESS");
  process.exit(2);
}

const abi = JSON.parse(
  readFileSync(resolve(root, "deployments/mainnet/SekaiAgent.json"), "utf8"),
).abi;

const publicCard = {
  name,
  codename: codename.toUpperCase(),
  archetype: process.env.ARCHETYPE || "Infiltrator",
  portraitId: process.env.PORTRAIT_ID || "inf-01",
  publicSummary:
    process.env.PUBLIC_SUMMARY ||
    `${process.env.ARCHETYPE || "Infiltrator"} operative. Details classified.`,
  level: Number(process.env.LEVEL || 1),
  xp: Number(process.env.XP || 0),
  missionCount: Number(process.env.MISSION_COUNT || 0),
  winRate: Number(process.env.WIN_RATE || 0),
};

const privateIntel = {
  personality: process.env.PERSONALITY || "Classified.",
  skills: {
    infiltration: Number(process.env.SKILL_INFILTRATION || 60),
    socialEngineering: Number(process.env.SKILL_SOCIAL || 50),
    forgery: Number(process.env.SKILL_FORGERY || 50),
    surveillance: Number(process.env.SKILL_SURVEILLANCE || 50),
    exfiltration: Number(process.env.SKILL_EXFIL || 50),
    tech: Number(process.env.SKILL_TECH || 45),
    combatRestraint: Number(process.env.SKILL_COMBAT || 70),
  },
  behaviorRules: (process.env.BEHAVIOR_RULES || "Prefer silence over charm")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean),
  memoryDigest: process.env.MEMORY_DIGEST || "Backfilled package.",
};

const packagePayload = {
  version: 1,
  publicCard,
  privateIntel,
};

console.log("Uploading sealed package…");
const storage = new OgStorageClient(
  process.env.OG_STORAGE_INDEXER || "https://indexer-storage-turbo.0g.ai",
  rpc,
  Number(process.env.OG_CHAIN_ID || 16661),
);
const uploaded = await storage.putSealedJson(
  packagePayload,
  password,
  storageKey.startsWith("0x") ? storageKey : `0x${storageKey}`,
);
const encryptedURI = uploaded.rootHash.startsWith("0g://")
  ? uploaded.rootHash
  : `0g://${uploaded.rootHash}`;
const metadataHash = keccak256(stringToHex(JSON.stringify(publicCard)));

console.log("Updating on-chain metadata…", {
  tokenId,
  encryptedURI,
  metadataHash,
  storageTx: uploaded.txHash,
});

const account = privateKeyToAccount(
  adminKey.startsWith("0x") ? adminKey : `0x${adminKey}`,
);
const chain = {
  id: Number(process.env.OG_CHAIN_ID || 16661),
  name: "0G Mainnet",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: { default: { http: [rpc] } },
};
const wallet = createWalletClient({
  account,
  chain,
  transport: http(rpc),
});
const publicClient = createPublicClient({ chain, transport: http(rpc) });

const txHash = await wallet.writeContract({
  address: agentAddress,
  abi,
  functionName: "updateMetadata",
  args: [BigInt(tokenId), encryptedURI, metadataHash],
});
const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
try {
  await fetch(`${api}/agents/cards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tokenId: String(tokenId),
      ownerAddress: account.address,
      ...publicCard,
      encryptedURI,
      metadataHash,
    }),
  });
} catch {
  // cache optional
}

console.log(
  JSON.stringify(
    {
      ok: true,
      tokenId,
      encryptedURI,
      metadataHash,
      updateTx: receipt.transactionHash,
      codename: publicCard.codename,
    },
    null,
    2,
  ),
);
