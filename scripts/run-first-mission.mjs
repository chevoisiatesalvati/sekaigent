#!/usr/bin/env node
/**
 * Create (admin) → accept → submitPlay for the first tiny mainnet mission.
 */
import {
  createWalletClient,
  createPublicClient,
  http,
  encodeFunctionData,
  decodeEventLog,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "node:fs";
import { generateMissionPlayOffline, MemoryStorage } from "@sekaigent/sdk";
import { keccak256, toBytes, concat, stringToBytes } from "viem";

function loadAbi(name) {
  return JSON.parse(
    readFileSync(new URL(`../deployments/mainnet/${name}.json`, import.meta.url), "utf8"),
  ).abi;
}

function criteriaCommitment(criteria, salt) {
  return keccak256(concat([stringToBytes(criteria), stringToBytes(salt)]));
}

const rpc = process.env.OG_RPC_URL ?? "https://evmrpc.0g.ai";
const vault = process.env.MISSION_VAULT_ADDRESS;
const key = process.env.ADMIN_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
const agentTokenId = BigInt(process.env.AGENT_TOKEN_ID ?? "1");

if (!vault || !key) {
  console.error("Need MISSION_VAULT_ADDRESS and ADMIN/DEPLOYER private key");
  process.exit(2);
}

const account = privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`);
const chain = {
  id: 16661,
  name: "0G Mainnet",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: { default: { http: [rpc] } },
};
const wallet = createWalletClient({ account, chain, transport: http(rpc) });
const publicClient = createPublicClient({ chain, transport: http(rpc) });
const abi = loadAbi("MissionVault");

const criteria = "no bribes; stealth only; prefer night shift";
const salt = `salt-${Date.now()}`;
const commitment = criteriaCommitment(criteria, salt);
const fee = parseEther("0.001"); // tiny fee
const now = Math.floor(Date.now() / 1000);
const startsAt = BigInt(now - 30);
const endsAt = BigInt(now + 120); // 2 minute mission for E2E
const brief = "Recover the shipment manifest without raising alarms.";

const createData = encodeFunctionData({
  abi,
  functionName: "createMission",
  args: [
    brief,
    commitment,
    keccak256(toBytes("rubric-v1")),
    startsAt,
    endsAt,
    fee,
    10,
  ],
});

const createHash = await wallet.sendTransaction({ to: vault, data: createData });
const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash });

let missionId;
for (const log of createReceipt.logs) {
  try {
    const decoded = decodeEventLog({
      abi,
      data: log.data,
      topics: log.topics,
    });
    if (decoded.eventName === "MissionCreated") {
      missionId = decoded.args.missionId;
      break;
    }
  } catch {
    // not our event
  }
}
if (missionId === undefined) {
  // fallback: nextMissionId()-1 via cast-like call
  const next = await publicClient.readContract({
    address: vault,
    abi,
    functionName: "nextMissionId",
  });
  missionId = next - 1n;
}

const acceptHash = await wallet.writeContract({
  address: vault,
  abi,
  functionName: "acceptMission",
  args: [missionId, agentTokenId],
  value: fee,
});
await publicClient.waitForTransactionReceipt({ hash: acceptHash });

const play = generateMissionPlayOffline({
  missionId: missionId.toString(),
  agentTokenId: agentTokenId.toString(),
  publicBrief: brief,
  agent: {
    personality: "cautious, analytical",
    skills: {
      infiltration: 62,
      socialEngineering: 55,
      forgery: 78,
      surveillance: 48,
      exfiltration: 58,
      tech: 44,
      combatRestraint: 88,
    },
    behaviorRules: ["no violence", "prefer forged credentials"],
    memoryDigest: "first mainnet agent",
  },
});

// Seal play locally (memory) for E2E artifact; storage upload optional
const mem = new MemoryStorage();
const sealed = await mem.putSealedJson(play, "play-seal");

const submitHash = await wallet.writeContract({
  address: vault,
  abi,
  functionName: "submitPlay",
  args: [missionId, agentTokenId, play.playHash],
});
await publicClient.waitForTransactionReceipt({ hash: submitHash });

const out = {
  missionId: missionId.toString(),
  criteria,
  salt,
  criteriaCommitment: commitment,
  entryFeeWei: fee.toString(),
  endsAt: endsAt.toString(),
  createTx: createHash,
  acceptTx: acceptHash,
  submitTx: submitHash,
  playHash: play.playHash,
  play,
  sealedPlayRoot: sealed.rootHash,
};
console.log(JSON.stringify(out, null, 2));
