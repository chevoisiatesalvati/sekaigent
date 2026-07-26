import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import {
  evaluateMissionPlayViaRouter,
  hashEvaluation,
  MemoryStorage,
  OgStorageClient,
} from "@sekaigent/sdk";
import type { AgentPrivateIntel, MissionPlay } from "@sekaigent/game-schemas";
import type { Hex } from "viem";
import { getPool } from "../db/pool.js";
import { config } from "../config.js";
import {
  createOgPublicClient,
  createOgWalletClient,
  missionVaultAbi,
} from "../chain/og-chain.js";
import { MissionsService } from "../missions/missions.service.js";
import { RelayerService } from "./relayer.service.js";

@Injectable()
export class SettleJobService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SettleJobService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private busy = false;
  private readonly memory = new MemoryStorage();
  private readonly og = new OgStorageClient(
    config.ogStorageIndexer,
    config.ogRpcUrl,
    config.ogChainId,
  );

  constructor(
    @Inject(MissionsService) private readonly missions: MissionsService,
    @Inject(RelayerService) private readonly relayer: RelayerService,
  ) {}

  onModuleInit() {
    if (!config.settleJobEnabled) {
      this.logger.log("settle job disabled");
      return;
    }
    this.timer = setInterval(() => {
      void this.runOnce();
    }, config.settleJobMs);
    void this.runOnce();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async runOnce(): Promise<number> {
    if (this.busy) return 0;
    if (!config.relayerPrivateKey) return 0;
    this.busy = true;
    let settled = 0;
    try {
      const pool = await getPool();
      const { rows } = await pool.query(
        `SELECT * FROM missions WHERE status = 'evaluating' AND on_chain_id IS NOT NULL`,
      );
      for (const mission of rows) {
        try {
          await this.evaluateAndSettle(mission);
          settled += 1;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.warn(`settle ${mission.id}: ${message}`);
        }
      }
    } finally {
      this.busy = false;
    }
    return settled;
  }

  private async loadPlay(playRow: Record<string, unknown>): Promise<MissionPlay | null> {
    if (playRow.sealed_json) {
      try {
        return JSON.parse(String(playRow.sealed_json)) as MissionPlay;
      } catch {
        /* continue */
      }
    }
    const uri = playRow.storage_uri ? String(playRow.storage_uri) : "";
    if (!uri) return null;
    try {
      if (uri.startsWith("mem://")) {
        return await this.memory.getSealedJson<MissionPlay>(
          uri,
          config.playSealPassword,
        );
      }
      return await this.og.getSealedJson<MissionPlay>(
        uri,
        config.playSealPassword,
      );
    } catch (err) {
      this.logger.warn(
        `play download failed ${uri}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  private async evaluateAndSettle(mission: Record<string, unknown>) {
    const missionDbId = String(mission.id);
    const onChainId = BigInt(String(mission.on_chain_id));
    if (!this.missions || typeof this.missions.listPlays !== "function") {
      throw new Error("missions_service_not_injected");
    }
    const plays = await this.missions.listPlays(missionDbId);
    const publicClient = createOgPublicClient();
    const onChainPlays: Record<string, unknown>[] = [];
    for (const playRow of plays) {
      const entrant = (await publicClient.readContract({
        address: config.missionVaultAddress,
        abi: missionVaultAbi,
        functionName: "entrants",
        args: [onChainId, BigInt(String(playRow.agent_token_id))],
      })) as readonly [
        `0x${string}`,
        bigint,
        `0x${string}`,
        bigint,
        `0x${string}`,
        boolean,
        boolean,
        boolean,
        boolean,
      ];
      if (entrant[6]) onChainPlays.push(playRow);
    }
    if (onChainPlays.length === 0) {
      await this.scrubEmptyEvaluating(missionDbId, onChainId);
      return;
    }

    const pool = await getPool();
    for (const playRow of onChainPlays) {
      const existing = await pool.query(
        `SELECT 1 FROM evaluations WHERE mission_id = $1 AND agent_token_id = $2`,
        [missionDbId, playRow.agent_token_id],
      );
      if (existing.rows.length > 0) continue;

      let play = await this.loadPlay(playRow);
      if (!play) {
        play = {
          missionId: String(mission.on_chain_id),
          agentTokenId: String(playRow.agent_token_id),
          approach: "Indexed play — sealed body unavailable",
          steps: [
            { action: "Recon", detail: "Recovered from chain hash only." },
            { action: "Execute", detail: "Score from stub body." },
            { action: "Exfil", detail: "Await full storage payload." },
          ],
          risksAccepted: ["incomplete play body"],
          resourcesUsed: ["surveillance"],
          contingencies: ["Abort if cover cracks."],
          finalOutcomeClaim: "Partial evaluation from playHash.",
          playHash: String(playRow.play_hash) as Hex,
          submittedAt: Math.floor(Date.now() / 1000),
        };
      }

      const skills: AgentPrivateIntel["skills"] = {
        infiltration: 50,
        socialEngineering: 50,
        forgery: 50,
        surveillance: 50,
        exfiltration: 50,
        tech: 50,
        combatRestraint: 50,
      };
      // Bias claimed lead skill so offline fallback can differentiate styles.
      const lead = play.resourcesUsed[0];
      if (lead && lead in skills) {
        skills[lead as keyof typeof skills] = 70;
      }
      const agent: AgentPrivateIntel = {
        personality: "unknown",
        skills,
        behaviorRules: [],
        memoryDigest: "",
      };

      const { evaluation, source } = await evaluateMissionPlayViaRouter(
        {
          missionId: String(mission.on_chain_id),
          publicBrief: String(mission.public_brief ?? ""),
          hiddenCriteria: String(mission.hidden_criteria ?? ""),
          play,
          agent,
        },
        {
          apiKey: config.ogComputeRouterApiKey || undefined,
          baseURL: config.ogComputeRouterBaseUrl,
          model: config.ogComputeModel,
          allowOffline: true,
        },
      );
      this.logger.log(
        `eval mission=${mission.on_chain_id} agent=${playRow.agent_token_id} source=${source} total=${evaluation.total}`,
      );
      const evalHash = hashEvaluation(evaluation);

      await this.relayer.broadcastPostEvaluation({
        missionId: onChainId,
        agentTokenId: BigInt(String(playRow.agent_token_id)),
        score: BigInt(evaluation.total),
        evalHash,
      });

      await pool.query(
        `INSERT INTO evaluations (
          mission_id, agent_token_id, play_hash, total, scores_json, reasoning,
          eval_hash, model_id, prompt_version, evaluated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,to_timestamp($10))
        ON CONFLICT (mission_id, agent_token_id) DO NOTHING`,
        [
          missionDbId,
          String(playRow.agent_token_id),
          evaluation.playHash,
          evaluation.total,
          JSON.stringify(evaluation.scores),
          evaluation.reasoning,
          evalHash,
          evaluation.modelId,
          evaluation.promptVersion,
          evaluation.evaluatedAt,
        ],
      );
    }

    const { txHash } = await this.relayer.broadcastSettle(onChainId);
    await pool.query(
      `UPDATE missions SET status = 'settled', settle_tx_hash = $1 WHERE id = $2`,
      [txHash, missionDbId],
    );
  }

  /**
   * Desk-only plays (storage recorded, no on-chain submit) cannot be graded.
   * Cancel on-chain when possible and mark the API row cancelled.
   */
  private async scrubEmptyEvaluating(
    missionDbId: string,
    onChainId: bigint,
  ): Promise<void> {
    const pool = await getPool();
    if (config.adminPrivateKey) {
      try {
        const wallet = createOgWalletClient(config.adminPrivateKey);
        const publicClient = createOgPublicClient();
        const hash = await wallet.writeContract({
          address: config.missionVaultAddress,
          abi: missionVaultAbi,
          functionName: "cancelMission",
          args: [onChainId],
          account: wallet.account!,
          chain: wallet.chain,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        this.logger.log(
          `cancel empty mission ${onChainId} ${hash}`,
        );
      } catch (err) {
        this.logger.warn(
          `cancel empty mission ${onChainId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    await pool.query(
      `UPDATE missions SET status = 'cancelled' WHERE id = $1 AND status = 'evaluating'`,
      [missionDbId],
    );
  }
}
