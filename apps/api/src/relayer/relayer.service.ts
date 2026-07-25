import { Injectable, Logger } from "@nestjs/common";
import {
  createWalletClient,
  http,
  encodeFunctionData,
  type Hex,
  type TransactionRequest,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "../config.js";
import {
  createOgPublicClient,
  createOgWalletClient,
  missionVaultAbi,
  ogChain,
} from "../chain/og-chain.js";

@Injectable()
export class RelayerService {
  private readonly logger = new Logger(RelayerService.name);

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

  async signDryRun(tx: TransactionRequest): Promise<Hex | null> {
    if (!config.relayerPrivateKey) return null;
    const account = privateKeyToAccount(config.relayerPrivateKey);
    const client = createWalletClient({
      account,
      transport: http(config.ogRpcUrl),
      chain: ogChain,
    });
    return client.signTransaction({
      ...tx,
      account,
      chain: ogChain,
    });
  }

  async broadcastPostEvaluation(input: {
    missionId: bigint;
    agentTokenId: bigint;
    score: bigint;
    evalHash: Hex;
  }): Promise<{ txHash: Hex }> {
    if (!config.relayerPrivateKey) {
      throw new Error("EVALUATOR_RELAYER_PRIVATE_KEY unset");
    }
    const wallet = createOgWalletClient(config.relayerPrivateKey);
    const publicClient = createOgPublicClient();
    const hash = await wallet.writeContract({
      address: config.missionVaultAddress,
      abi: missionVaultAbi,
      functionName: "postEvaluation",
      args: [
        input.missionId,
        input.agentTokenId,
        input.score,
        input.evalHash,
      ],
      account: wallet.account!,
      chain: wallet.chain,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    this.logger.log(`postEvaluation ${receipt.transactionHash}`);
    return { txHash: receipt.transactionHash };
  }

  async broadcastSettle(missionId: bigint): Promise<{ txHash: Hex }> {
    if (!config.relayerPrivateKey) {
      throw new Error("EVALUATOR_RELAYER_PRIVATE_KEY unset");
    }
    const wallet = createOgWalletClient(config.relayerPrivateKey);
    const publicClient = createOgPublicClient();
    const hash = await wallet.writeContract({
      address: config.missionVaultAddress,
      abi: missionVaultAbi,
      functionName: "settle",
      args: [missionId],
      account: wallet.account!,
      chain: wallet.chain,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    this.logger.log(`settle ${receipt.transactionHash}`);
    return { txHash: receipt.transactionHash };
  }
}
