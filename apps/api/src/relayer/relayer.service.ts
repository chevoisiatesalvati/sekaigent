import { Injectable } from "@nestjs/common";
import {
  createWalletClient,
  http,
  encodeFunctionData,
  type Hex,
  type TransactionRequest,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "../config.js";

const missionVaultAbi = [
  {
    type: "function",
    name: "postEvaluation",
    stateMutability: "nonpayable",
    inputs: [
      { name: "missionId", type: "uint256" },
      { name: "agentTokenId", type: "uint256" },
      { name: "score", type: "uint256" },
      { name: "evalHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "settle",
    stateMutability: "nonpayable",
    inputs: [{ name: "missionId", type: "uint256" }],
    outputs: [],
  },
] as const;

@Injectable()
export class RelayerService {
  /** Build unsigned/signed tx data without broadcasting (dry-run). */
  buildPostEvaluationTx(input: {
    missionId: bigint;
    agentTokenId: bigint;
    score: bigint;
    evalHash: Hex;
  }): { to: Hex; data: Hex; account?: Hex } {
    const data = encodeFunctionData({
      abi: missionVaultAbi,
      functionName: "postEvaluation",
      args: [
        input.missionId,
        input.agentTokenId,
        input.score,
        input.evalHash,
      ],
    });
    const account = config.relayerPrivateKey
      ? privateKeyToAccount(config.relayerPrivateKey).address
      : undefined;
    return {
      to: config.missionVaultAddress,
      data,
      account,
    };
  }

  buildSettleTx(missionId: bigint): { to: Hex; data: Hex; account?: Hex } {
    const data = encodeFunctionData({
      abi: missionVaultAbi,
      functionName: "settle",
      args: [missionId],
    });
    const account = config.relayerPrivateKey
      ? privateKeyToAccount(config.relayerPrivateKey).address
      : undefined;
    return {
      to: config.missionVaultAddress,
      data,
      account,
    };
  }

  /** Sign a dry-run transaction locally; does not broadcast. */
  async signDryRun(tx: TransactionRequest): Promise<Hex | null> {
    if (!config.relayerPrivateKey) return null;
    const account = privateKeyToAccount(config.relayerPrivateKey);
    const client = createWalletClient({
      account,
      transport: http(config.ogRpcUrl),
    });
    return client.signTransaction({
      ...tx,
      account,
      chain: undefined,
    });
  }
}
