import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import {
  decodeEventLog,
  parseAbiItem,
  type Hex,
  type Log,
  type PublicClient,
} from "viem";
import { getPool } from "../db/pool.js";
import { config } from "../config.js";
import { createOgPublicClient } from "../chain/og-chain.js";

const MISSION_CREATED = parseAbiItem(
  "event MissionCreated(uint256 indexed missionId, bytes32 criteriaCommitment, uint256 entryFeeWei, uint64 startsAt, uint64 endsAt)",
);
const MISSION_ACCEPTED = parseAbiItem(
  "event MissionAccepted(uint256 indexed missionId, uint256 indexed agentTokenId, address indexed player, uint256 feePaid)",
);
const PLAY_SUBMITTED = parseAbiItem(
  "event PlaySubmitted(uint256 indexed missionId, uint256 indexed agentTokenId, bytes32 playHash, uint64 submittedAt)",
);
const CRITERIA_REVEALED = parseAbiItem(
  "event CriteriaRevealed(uint256 indexed missionId, bytes32 commitment)",
);
const EVALUATION_POSTED = parseAbiItem(
  "event EvaluationPosted(uint256 indexed missionId, uint256 indexed agentTokenId, uint256 score, bytes32 evalHash)",
);
const MISSION_SETTLED = parseAbiItem(
  "event MissionSettled(uint256 indexed missionId, uint256 prizePoolWei, uint256 paidCount)",
);

const EVENT_ABIS = [
  MISSION_CREATED,
  MISSION_ACCEPTED,
  PLAY_SUBMITTED,
  CRITERIA_REVEALED,
  EVALUATION_POSTED,
  MISSION_SETTLED,
] as const;

@Injectable()
export class IndexerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IndexerService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  onModuleInit() {
    if (!config.indexerEnabled) {
      this.logger.log("indexer disabled (INDEXER_ENABLED=0)");
      return;
    }
    if (
      config.missionVaultAddress ===
      "0x0000000000000000000000000000000000000000"
    ) {
      this.logger.warn("indexer skipped — MISSION_VAULT_ADDRESS unset");
      return;
    }
    void this.pollOnce();
    this.timer = setInterval(() => {
      void this.pollOnce();
    }, config.indexerPollMs);
    this.logger.log(
      `indexer polling every ${config.indexerPollMs}ms from block ${config.indexerStartBlock}`,
    );
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  createClient(): PublicClient {
    return createOgPublicClient();
  }

  /** Index a pre-decoded event fixture (unit/integration without live chain). */
  async ingestFixture(event: {
    txHash: Hex;
    logIndex: number;
    eventName: string;
    blockNumber: bigint;
    payload: Record<string, unknown>;
  }): Promise<void> {
    const pool = await getPool();
    await pool.query(
      `INSERT INTO indexed_events (tx_hash, log_index, event_name, payload_json, block_number)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (tx_hash, log_index) DO NOTHING`,
      [
        event.txHash,
        event.logIndex,
        event.eventName,
        JSON.stringify(event.payload),
        event.blockNumber.toString(),
      ],
    );
    await this.applyDecodedEvent(event.eventName, event.payload);
  }

  async pollOnce(): Promise<{ from: number; to: number; logs: number }> {
    if (this.running) return { from: 0, to: 0, logs: 0 };
    this.running = true;
    try {
      const client = this.createClient();
      const pool = await getPool();
      const { rows } = await pool.query<{ last_block: string }>(
        `SELECT last_block::text FROM indexer_state WHERE id = 'mission_vault'`,
      );
      let last = Number(rows[0]?.last_block ?? 0);
      if (last < config.indexerStartBlock) last = config.indexerStartBlock;
      const latest = Number(await client.getBlockNumber());
      if (latest <= last) return { from: last, to: latest, logs: 0 };

      let cursor = last + 1;
      let totalLogs = 0;
      while (cursor <= latest) {
        const to = Math.min(cursor + config.indexerChunkSize - 1, latest);
        const logs = await client.getLogs({
          address: config.missionVaultAddress,
          fromBlock: BigInt(cursor),
          toBlock: BigInt(to),
        });
        totalLogs += await this.indexLogs(logs as Log[]);
        await pool.query(
          `UPDATE indexer_state SET last_block = $1, updated_at = NOW() WHERE id = 'mission_vault'`,
          [to],
        );
        cursor = to + 1;
      }
      if (totalLogs > 0) {
        this.logger.log(`indexed ${totalLogs} logs through block ${latest}`);
      }
      return { from: last + 1, to: latest, logs: totalLogs };
    } catch (err) {
      this.logger.warn(
        `indexer poll failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { from: 0, to: 0, logs: 0 };
    } finally {
      this.running = false;
    }
  }

  async indexLogs(logs: Log[]): Promise<number> {
    let count = 0;
    for (const log of logs) {
      const decoded = this.decodeLog(log);
      if (!decoded) continue;
      await this.ingestFixture({
        txHash: log.transactionHash!,
        logIndex: Number(log.logIndex ?? 0),
        eventName: decoded.eventName,
        blockNumber: log.blockNumber!,
        payload: {
          ...decoded.args,
          address: log.address,
          txHash: log.transactionHash,
        },
      });
      count++;
    }
    return count;
  }

  private decodeLog(log: Log): {
    eventName: string;
    args: Record<string, unknown>;
  } | null {
    for (const abi of EVENT_ABIS) {
      try {
        const decoded = decodeEventLog({
          abi: [abi],
          data: log.data,
          topics: log.topics as [Hex, ...Hex[]],
        });
        const args: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(decoded.args ?? {})) {
          args[key] =
            typeof value === "bigint" ? value.toString() : (value as unknown);
        }
        return { eventName: decoded.eventName, args };
      } catch {
        // try next abi
      }
    }
    return null;
  }

  private async applyDecodedEvent(
    eventName: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const pool = await getPool();
    const missionId = String(payload.missionId ?? "");
    if (!missionId) return;

    if (eventName === "MissionCreated") {
      const commitment = String(payload.criteriaCommitment ?? "");
      const matched = await pool.query(
        `SELECT id FROM missions
         WHERE criteria_commitment = $1 AND (on_chain_id IS NULL OR on_chain_id = $2)
         ORDER BY created_at DESC LIMIT 1`,
        [commitment, missionId],
      );
      if (matched.rows[0]) {
        await pool.query(
          `UPDATE missions SET on_chain_id = $1, status = 'open',
             entry_fee_wei = COALESCE(NULLIF($2,''), entry_fee_wei),
             starts_at = to_timestamp($3), ends_at = to_timestamp($4),
             create_tx_hash = COALESCE(create_tx_hash, $5)
           WHERE id = $6`,
          [
            missionId,
            String(payload.entryFeeWei ?? ""),
            Number(payload.startsAt ?? 0),
            Number(payload.endsAt ?? 0),
            String(payload.txHash ?? ""),
            matched.rows[0].id,
          ],
        );
      } else {
        const id = `chain-${missionId}`;
        await pool.query(
          `INSERT INTO missions (
            id, on_chain_id, region_id, title, public_brief, duration,
            starts_at, ends_at, entry_fee_wei, prize_pool_wei, max_entrants,
            status, criteria_commitment, rubric_id, create_tx_hash
          ) VALUES (
            $1,$2,'unknown',$3,$3,'daily',to_timestamp($4),to_timestamp($5),
            $6,'0',100,'open',$7,'default-v1',$8
          )
          ON CONFLICT (id) DO UPDATE SET
            on_chain_id = EXCLUDED.on_chain_id,
            status = 'open',
            entry_fee_wei = EXCLUDED.entry_fee_wei`,
          [
            id,
            missionId,
            `Mission #${missionId}`,
            Number(payload.startsAt ?? 0),
            Number(payload.endsAt ?? 0),
            String(payload.entryFeeWei ?? "0"),
            commitment || `0x${"0".repeat(64)}`,
            String(payload.txHash ?? ""),
          ],
        );
      }
      return;
    }

    const missionRow = await this.resolveMissionRow(missionId);
    if (!missionRow) return;
    const dbId = String(missionRow.id);

    if (eventName === "MissionAccepted") {
      await pool.query(
        `INSERT INTO entrants (mission_id, agent_token_id, player_address)
         VALUES ($1,$2,$3)
         ON CONFLICT (mission_id, agent_token_id) DO UPDATE
         SET player_address = EXCLUDED.player_address`,
        [dbId, String(payload.agentTokenId), String(payload.player)],
      );
      await pool.query(
        `UPDATE missions SET prize_pool_wei = (
           COALESCE(NULLIF(prize_pool_wei,''),'0')::numeric + $1::numeric
         )::text WHERE id = $2`,
        [String(payload.feePaid ?? "0"), dbId],
      );
      return;
    }

    if (eventName === "PlaySubmitted") {
      await pool.query(
        `INSERT INTO plays (mission_id, agent_token_id, play_hash, submitted_at)
         VALUES ($1,$2,$3,to_timestamp($4))
         ON CONFLICT (mission_id, agent_token_id) DO UPDATE
         SET play_hash = EXCLUDED.play_hash, submitted_at = EXCLUDED.submitted_at`,
        [
          dbId,
          String(payload.agentTokenId),
          String(payload.playHash),
          Number(payload.submittedAt ?? 0),
        ],
      );
      return;
    }

    if (eventName === "CriteriaRevealed") {
      await pool.query(
        `UPDATE missions SET status = 'evaluating' WHERE id = $1 AND status <> 'settled'`,
        [dbId],
      );
      return;
    }

    if (eventName === "MissionSettled") {
      await pool.query(
        `UPDATE missions SET status = 'settled', prize_pool_wei = $1 WHERE id = $2`,
        [String(payload.prizePoolWei ?? "0"), dbId],
      );
    }
  }

  private async resolveMissionRow(
    onChainId: string,
  ): Promise<{ id: string } | null> {
    const pool = await getPool();
    const { rows } = await pool.query<{ id: string }>(
      `SELECT id FROM missions WHERE on_chain_id = $1 LIMIT 1`,
      [onChainId],
    );
    if (rows[0]) return rows[0];
    const chainId = `chain-${onChainId}`;
    const fallback = await pool.query<{ id: string }>(
      `SELECT id FROM missions WHERE id = $1 LIMIT 1`,
      [chainId],
    );
    return fallback.rows[0] ?? null;
  }

  async listEvents() {
    const pool = await getPool();
    const { rows } = await pool.query(
      `SELECT * FROM indexed_events ORDER BY block_number DESC, log_index DESC LIMIT 100`,
    );
    return rows;
  }
}
