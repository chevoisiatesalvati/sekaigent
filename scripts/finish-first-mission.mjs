#!/usr/bin/env node
/**
 * After endsAt: revealCriteria → postEvaluation → settle; write public audit.
 */
import {
  createWalletClient,
  createPublicClient,
  http,
  encodeFunctionData,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync, writeFileSync } from "node:fs";
import {
  evaluateMissionPlayOffline,
  generateMissionPlayOffline,
  hashEvaluation,
} from "@sekaigent/sdk";

const mission = JSON.parse(
  readFileSync(new URL("../deployments/mainnet/first-mission.json", import.meta.url), "utf8"),
);
const abi = JSON.parse(
  readFileSync(new URL("../deployments/mainnet/MissionVault.json", import.meta.url), "utf8"),
).abi;

const rpc = process.env.OG_RPC_URL ?? "https://evmrpc.0g.ai";
const vault = process.env.MISSION_VAULT_ADDRESS || mission.vault;
const key = process.env.EVALUATOR_RELAYER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
const account = privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`);
const chain = {
  id: 16661,
  name: "0G Mainnet",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: { default: { http: [rpc] } },
};
const wallet = createWalletClient({ account, chain, transport: http(rpc) });
const publicClient = createPublicClient({ chain, transport: http(rpc) });

const missionId = BigInt(mission.missionId);
const agentTokenId = BigInt(mission.agentTokenId);
const endsAt = Number(mission.endsAt);
const now = Math.floor(Date.now() / 1000);
if (now < endsAt) {
  const waitMs = (endsAt - now + 2) * 1000;
  console.error(`Waiting ${waitMs}ms for mission window to end...`);
  await new Promise((r) => setTimeout(r, waitMs));
}

const revealHash = await wallet.writeContract({
  address: vault,
  abi,
  functionName: "revealCriteria",
  args: [missionId, mission.criteria, mission.salt],
});
await publicClient.waitForTransactionReceipt({ hash: revealHash });

const play = generateMissionPlayOffline({
  missionId: mission.missionId,
  agentTokenId: mission.agentTokenId,
  publicBrief: "Recover the shipment manifest without raising alarms.",
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
// Use the committed playHash from mission file
play.playHash = mission.playHash;

const evaluation = evaluateMissionPlayOffline({
  missionId: mission.missionId,
  publicBrief: "Recover the shipment manifest without raising alarms.",
  hiddenCriteria: mission.criteria,
  play,
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
const evalHash = hashEvaluation(evaluation);

const evalTx = await wallet.writeContract({
  address: vault,
  abi,
  functionName: "postEvaluation",
  args: [missionId, agentTokenId, BigInt(evaluation.total), evalHash],
});
await publicClient.waitForTransactionReceipt({ hash: evalTx });

const settleTx = await wallet.writeContract({
  address: vault,
  abi,
  functionName: "settle",
  args: [missionId],
});
await publicClient.waitForTransactionReceipt({ hash: settleTx });

const audit = {
  missionId: mission.missionId,
  revealedCriteria: mission.criteria,
  salt: mission.salt,
  play,
  evaluation,
  evalHash,
  txs: { revealHash, evalTx, settleTx },
  rankings: [
    {
      rank: 1,
      agentTokenId: mission.agentTokenId,
      total: evaluation.total,
      reasoning: evaluation.reasoning,
    },
  ],
};

writeFileSync(
  new URL("../deployments/mainnet/first-mission-audit.json", import.meta.url),
  JSON.stringify(audit, null, 2) + "\n",
);
console.log(JSON.stringify(audit, null, 2));
