#!/usr/bin/env node
/**
 * Dry-run / broadcast postEvaluation + settle via relayer key.
 */
import { encodeFunctionData, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "node:fs";
import { evaluateMissionPlayOffline, generateMissionPlayOffline, hashEvaluation } from "@sekaigent/sdk";

const vault = process.env.MISSION_VAULT_ADDRESS;
const key = process.env.EVALUATOR_RELAYER_PRIVATE_KEY;
const broadcast = process.env.BROADCAST === "1";
const missionId = BigInt(process.env.ON_CHAIN_MISSION_ID ?? "1");
const agentTokenId = BigInt(process.env.AGENT_TOKEN_ID ?? "1");

const agent = {
  personality: "cautious",
  skills: {
    infiltration: 60,
    socialEngineering: 50,
    forgery: 80,
    surveillance: 45,
    exfiltration: 55,
    tech: 40,
    combatRestraint: 90,
  },
  behaviorRules: ["no violence"],
  memoryDigest: "",
};

const play = generateMissionPlayOffline({
  missionId: missionId.toString(),
  agentTokenId: agentTokenId.toString(),
  publicBrief: "Recover the shipment manifest without raising alarms.",
  agent,
});

const evaluation = evaluateMissionPlayOffline({
  missionId: missionId.toString(),
  publicBrief: "Recover the shipment manifest without raising alarms.",
  hiddenCriteria: process.env.HIDDEN_CRITERIA ?? "no bribes; stealth only",
  play,
  agent,
});
const evalHash = hashEvaluation(evaluation);

const abi = JSON.parse(
  readFileSync(new URL("../deployments/mainnet/MissionVault.json", import.meta.url), "utf8"),
).abi;

const postData = encodeFunctionData({
  abi,
  functionName: "postEvaluation",
  args: [missionId, agentTokenId, BigInt(evaluation.total), evalHash],
});
const settleData = encodeFunctionData({
  abi,
  functionName: "settle",
  args: [missionId],
});

const audit = {
  evaluation,
  evalHash,
  postEvaluationCalldata: postData,
  settleCalldata: settleData,
  broadcast,
};

if (!broadcast || !vault || !key) {
  console.log(JSON.stringify(audit, null, 2));
  console.error("Dry-run only. Set BROADCAST=1, MISSION_VAULT_ADDRESS, EVALUATOR_RELAYER_PRIVATE_KEY to send.");
  process.exit(vault && key && broadcast ? 0 : 2);
}

const account = privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`);
const rpc = process.env.OG_RPC_URL ?? "https://evmrpc.0g.ai";
const client = createWalletClient({
  account,
  transport: http(rpc),
  chain: {
    id: 16661,
    name: "0G Mainnet",
    nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
    rpcUrls: { default: { http: [rpc] } },
  },
});

const postTx = await client.sendTransaction({ to: vault, data: postData });
const settleTx = await client.sendTransaction({ to: vault, data: settleData });
console.log(JSON.stringify({ ...audit, postTx, settleTx }, null, 2));
