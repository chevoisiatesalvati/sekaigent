import {
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
    private readonly missions: MissionsService,
    private readonly relayer: RelayerService,
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
          this.logger.warn(
            `settle ${mission.id}: ${err instanceof Error ? err.message : String(err)}`,
          );
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
    const plays = await this.missions.listPlays(missionDbId);
    if (plays.length === 0) {
      throw new Error("no plays");
    }

    const pool = await getPool();
    for (const playRow of plays) {
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

      const agent: AgentPrivateIntel = {
        personality: "unknown",
        skills: {
          infiltration: 50,
          socialEngineering: 50,
          forgery: 50,
          surveillance: 50,
          exfiltration: 50,
          tech: 50,
          combatRestraint: 50,
        },
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
}
