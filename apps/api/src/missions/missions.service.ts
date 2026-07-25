import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { keccak256, stringToHex, type Hex } from "viem";
import { getPool } from "../db/pool.js";
import { computeCriteriaCommitment } from "./criteria.js";
import { config } from "../config.js";
import {
  createOgPublicClient,
  createOgWalletClient,
  missionVaultAbi,
} from "../chain/og-chain.js";
import {
  ARCHIVE_CASE,
  EMBASSY_CASE,
  HARBOR_CASE,
  REGION_CASE,
  REGION_SOLUTION,
} from "./case-dossiers.js";

export type CreateMissionInput = {
  regionId: string;
  title: string;
  publicBrief: string;
  caseFile?: Array<{
    id: string;
    kind: string;
    title: string;
    body: string;
  }>;
  duration: "daily" | "weekly" | "monthly";
  startsAt: string;
  endsAt: string;
  entryFeeWei: string;
  maxEntrants: number;
  hiddenCriteria: string;
  solutionNotes?: string;
  salt: string;
  rubricId?: string;
  /** When true (default), broadcast createMission if ADMIN_PRIVATE_KEY set. */
  broadcast?: boolean;
};

@Injectable()
export class MissionsService {
  private readonly logger = new Logger(MissionsService.name);

  async createMission(input: CreateMissionInput) {
    const criteriaCommitment = computeCriteriaCommitment(
      input.hiddenCriteria,
      input.salt,
    );
    const id = randomUUID();
    const rubricId = input.rubricId ?? "default-v1";
    const pool = await getPool();

    await pool.query(
      `INSERT INTO missions (
        id, region_id, title, public_brief, duration,
        starts_at, ends_at, entry_fee_wei, prize_pool_wei, max_entrants,
        status, criteria_commitment, rubric_id, hidden_criteria, salt,
        case_file, solution_notes
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,'0',$9,'scheduled',$10,$11,$12,$13,$14::jsonb,$15
      )`,
      [
        id,
        input.regionId,
        input.title,
        input.publicBrief,
        input.duration,
        input.startsAt,
        input.endsAt,
        input.entryFeeWei,
        input.maxEntrants,
        criteriaCommitment,
        rubricId,
        input.hiddenCriteria,
        input.salt,
        JSON.stringify(input.caseFile ?? []),
        input.solutionNotes ?? null,
      ],
    );

    let onChainId: string | null = null;
    let createTxHash: string | null = null;
    const shouldBroadcast = input.broadcast !== false;

    if (shouldBroadcast && config.adminPrivateKey) {
      try {
        const wallet = createOgWalletClient(config.adminPrivateKey);
        const publicClient = createOgPublicClient();
        const startsAt = BigInt(
          Math.floor(new Date(input.startsAt).getTime() / 1000),
        );
        const endsAt = BigInt(
          Math.floor(new Date(input.endsAt).getTime() / 1000),
        );
        const rubricHash = keccak256(stringToHex(rubricId)) as Hex;
        const hash = await wallet.writeContract({
          address: config.missionVaultAddress,
          abi: missionVaultAbi,
          functionName: "createMission",
          args: [
            input.publicBrief,
            criteriaCommitment as Hex,
            rubricHash,
            startsAt,
            endsAt,
            BigInt(input.entryFeeWei),
            input.maxEntrants,
          ],
          account: wallet.account!,
          chain: wallet.chain,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        createTxHash = receipt.transactionHash;
        // Prefer return value from logs via MissionCreated topic
        for (const log of receipt.logs) {
          if (
            log.address.toLowerCase() ===
              config.missionVaultAddress.toLowerCase() &&
            log.topics[1]
          ) {
            onChainId = BigInt(log.topics[1]).toString();
            break;
          }
        }
        if (onChainId) {
          await pool.query(
            `UPDATE missions SET on_chain_id = $1, status = 'open', create_tx_hash = $2 WHERE id = $3`,
            [onChainId, createTxHash, id],
          );
        }
      } catch (err) {
        this.logger.warn(
          `createMission broadcast failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return {
      id,
      onChainId,
      createTxHash,
      criteriaCommitment,
      rubricId,
      status: onChainId ? ("open" as const) : ("scheduled" as const),
    };
  }

  async revealMission(id: string) {
    const mission = await this.getMission(id);
    if (!mission) throw new Error("mission_not_found");
    const onChainId = mission.on_chain_id;
    if (onChainId == null) throw new Error("mission_not_on_chain");
    if (!mission.hidden_criteria || !mission.salt) {
      throw new Error("missing_criteria_or_salt");
    }
    const endsAt = new Date(String(mission.ends_at)).getTime();
    if (Date.now() < endsAt) throw new Error("mission_still_open");
    if (!config.adminPrivateKey) throw new Error("ADMIN_PRIVATE_KEY unset");

    const wallet = createOgWalletClient(config.adminPrivateKey);
    const publicClient = createOgPublicClient();
    const hash = await wallet.writeContract({
      address: config.missionVaultAddress,
      abi: missionVaultAbi,
      functionName: "revealCriteria",
      args: [
        BigInt(String(onChainId)),
        String(mission.hidden_criteria),
        String(mission.salt),
      ],
      account: wallet.account!,
      chain: wallet.chain,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const pool = await getPool();
    await pool.query(
      `UPDATE missions SET status = 'evaluating', reveal_tx_hash = $1 WHERE id = $2`,
      [receipt.transactionHash, id],
    );
    return {
      id,
      onChainId: String(onChainId),
      revealTxHash: receipt.transactionHash,
      status: "evaluating" as const,
    };
  }

  /** Ensure dossier pages exist (persist when empty so Brief can mark Signals). */
  private async ensureCaseFile(
    row: Record<string, unknown> | null,
  ): Promise<Record<string, unknown> | null> {
    if (!row) return null;
    const existing = row.case_file;
    const hasPages =
      Array.isArray(existing) && (existing as unknown[]).length > 0;
    if (hasPages) return row;

    const regionId = String(row.region_id ?? "");
    const dossier = REGION_CASE[regionId];
    if (!dossier) return row;

    const solution =
      row.solution_notes != null && String(row.solution_notes).trim() !== ""
        ? String(row.solution_notes)
        : (REGION_SOLUTION[regionId] ?? null);

    const pool = await getPool();
    await pool.query(
      `UPDATE missions
       SET case_file = $1::jsonb,
           solution_notes = COALESCE(NULLIF(solution_notes, ''), $2)
       WHERE id = $3`,
      [JSON.stringify(dossier), solution, String(row.id)],
    );
    return {
      ...row,
      case_file: dossier,
      solution_notes: solution ?? row.solution_notes,
    };
  }

  async listMissions() {
    const pool = await getPool();
    // Live-first: hide API-only demos (no vault id) unless SEED_DEMO is on.
    const { rows } = await pool.query(
      config.seedDemo
        ? `SELECT id, on_chain_id, region_id, title, public_brief, duration, starts_at, ends_at,
                entry_fee_wei, prize_pool_wei, max_entrants, status,
                criteria_commitment, rubric_id, case_file, solution_notes
         FROM missions
         ORDER BY starts_at DESC`
        : `SELECT id, on_chain_id, region_id, title, public_brief, duration, starts_at, ends_at,
                entry_fee_wei, prize_pool_wei, max_entrants, status,
                criteria_commitment, rubric_id, case_file, solution_notes
         FROM missions
         WHERE on_chain_id IS NOT NULL
         ORDER BY starts_at DESC`,
    );
    const out: Record<string, unknown>[] = [];
    for (const row of rows) {
      const filled = await this.ensureCaseFile(row);
      if (filled) out.push(filled);
    }
    return out;
  }

  async getMission(id: string) {
    const pool = await getPool();
    const byId = await pool.query(`SELECT * FROM missions WHERE id = $1`, [id]);
    if (byId.rows[0]) return this.ensureCaseFile(byId.rows[0]);
    if (/^\d+$/.test(id)) {
      const byChain = await pool.query(
        `SELECT * FROM missions WHERE on_chain_id = $1 LIMIT 1`,
        [id],
      );
      return this.ensureCaseFile(byChain.rows[0] ?? null);
    }
    return null;
  }

  async getAudit(id: string) {
    const mission = await this.getMission(id);
    if (!mission) return null;
    const missionKey = String(mission.id);
    const pool = await getPool();
    const { rows: evals } = await pool.query(
      `SELECT * FROM evaluations WHERE mission_id = $1 ORDER BY total DESC`,
      [missionKey],
    );
    if (evals.length > 0) {
      return {
        missionId: missionKey,
        onChainId: mission.on_chain_id ?? undefined,
        revealedCriteria: mission?.hidden_criteria ?? undefined,
        solutionNotes: mission?.solution_notes ?? undefined,
        rankings: evals.map((row, index) => ({
          rank: index + 1,
          agentTokenId: row.agent_token_id,
          total: row.total,
          reasoning: row.reasoning,
          scores: JSON.parse(String(row.scores_json)),
        })),
      };
    }

    const auditPath = resolve(
      process.cwd(),
      "../../deployments/mainnet/first-mission-audit.json",
    );
    if (
      config.seedDemo &&
      (id === "1" || id === "mainnet-1") &&
      existsSync(auditPath)
    ) {
      return JSON.parse(readFileSync(auditPath, "utf8"));
    }
    return null;
  }

  async listPlays(missionDbId: string) {
    const pool = await getPool();
    const { rows } = await pool.query(
      `SELECT * FROM plays WHERE mission_id = $1`,
      [missionDbId],
    );
    return rows;
  }

  async recordPlayStorage(input: {
    missionId: string;
    agentTokenId: string;
    playHash: string;
    storageUri: string;
    sealedJson?: string;
  }) {
    const mission = await this.getMission(input.missionId);
    if (!mission) throw new Error("mission_not_found");
    const pool = await getPool();
    await pool.query(
      `INSERT INTO plays (mission_id, agent_token_id, play_hash, storage_uri, submitted_at, sealed_json)
       VALUES ($1,$2,$3,$4,NOW(),$5)
       ON CONFLICT (mission_id, agent_token_id) DO UPDATE SET
         play_hash = EXCLUDED.play_hash,
         storage_uri = EXCLUDED.storage_uri,
         sealed_json = COALESCE(EXCLUDED.sealed_json, plays.sealed_json)`,
      [
        String(mission.id),
        input.agentTokenId,
        input.playHash,
        input.storageUri,
        input.sealedJson ?? null,
      ],
    );
    return { ok: true };
  }

  async seedDemoData(): Promise<{ seeded: boolean; count: number }> {
    if (!config.seedDemo) {
      return { seeded: false, count: 0 };
    }
    const pool = await getPool();
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM missions`);
    const count = Number((rows[0] as { n: number }).n ?? 0);
    if (count > 0) return { seeded: false, count };

    const now = Date.now();
    const openEnds = new Date(now + 7 * 86400000).toISOString();
    const settledEnds = new Date(now - 3600000).toISOString();
    const starts = new Date(now - 86400000).toISOString();

    await pool.query(
      `INSERT INTO missions (
        id, on_chain_id, region_id, title, public_brief, duration,
        starts_at, ends_at, entry_fee_wei, prize_pool_wei, max_entrants,
        status, criteria_commitment, rubric_id, hidden_criteria, salt,
        case_file, solution_notes
      ) VALUES
      ($1,NULL,'harbor','Harbor Manifest','Recover the shipment manifest without raising alarms.','daily',$2,$3,'1000000000000000','0',100,'open',$4,'default-v1',$5,$6,$7::jsonb,$8),
      ($9,NULL,'embassy','Embassy Shadow','Identify the courier without tipping the security detail.','weekly',$2,$3,'2000000000000000','0',100,'open',$10,'default-v1',$11,$12,$13::jsonb,$14),
      ($15,NULL,'archive','Ash Archive Brief','Locate the redacted ledger page in the ash wing.','monthly',$2,$16,'1500000000000000','0',50,'settled',$17,'default-v1',$18,$19,$20::jsonb,$21)
      `,
      [
        "demo-harbor",
        starts,
        openEnds,
        computeCriteriaCommitment(
          "no bribes; stealth only; prefer night shift",
          "salt-harbor-demo",
        ),
        "no bribes; stealth only; prefer night shift",
        "salt-harbor-demo",
        JSON.stringify(HARBOR_CASE),
        REGION_SOLUTION.harbor,
        "demo-embassy",
        computeCriteriaCommitment("do not alert the ambassador", "salt-embassy"),
        "do not alert the ambassador",
        "salt-embassy",
        JSON.stringify(EMBASSY_CASE),
        REGION_SOLUTION.embassy,
        "demo-archive",
        settledEnds,
        computeCriteriaCommitment("leave no forensic trace", "salt-archive"),
        "leave no forensic trace",
        "salt-archive",
        JSON.stringify(ARCHIVE_CASE),
        REGION_SOLUTION.archive,
      ],
    );

    const after = await pool.query(`SELECT COUNT(*)::int AS n FROM missions`);
    return {
      seeded: true,
      count: Number((after.rows[0] as { n: number }).n),
    };
  }
}
