import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { getPool } from "../db/pool.js";
import { computeCriteriaCommitment } from "./criteria.js";

export type CreateMissionInput = {
  regionId: string;
  title: string;
  publicBrief: string;
  duration: "daily" | "weekly" | "monthly";
  startsAt: string;
  endsAt: string;
  entryFeeWei: string;
  maxEntrants: number;
  hiddenCriteria: string;
  salt: string;
  rubricId?: string;
};

@Injectable()
export class MissionsService {
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
        status, criteria_commitment, rubric_id, hidden_criteria, salt
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,'0',$9,'scheduled',$10,$11,$12,$13
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
      ],
    );

    return {
      id,
      criteriaCommitment,
      rubricId,
      status: "scheduled" as const,
    };
  }

  async listMissions() {
    const pool = await getPool();
    const { rows } = await pool.query(
      `SELECT id, region_id, title, public_brief, duration, starts_at, ends_at,
              entry_fee_wei, prize_pool_wei, max_entrants, status,
              criteria_commitment, rubric_id
       FROM missions
       ORDER BY starts_at DESC`,
    );
    return rows;
  }

  async getMission(id: string) {
    const pool = await getPool();
    const { rows } = await pool.query(`SELECT * FROM missions WHERE id = $1`, [
      id,
    ]);
    return rows[0] ?? null;
  }

  async getAudit(id: string) {
    const pool = await getPool();
    const { rows: evals } = await pool.query(
      `SELECT * FROM evaluations WHERE mission_id = $1 ORDER BY total DESC`,
      [id],
    );
    if (evals.length > 0) {
      return {
        missionId: id,
        rankings: evals.map((row, index) => ({
          rank: index + 1,
          agentTokenId: row.agent_token_id,
          total: row.total,
          reasoning: row.reasoning,
          scores: JSON.parse(String(row.scores_json)),
        })),
      };
    }

    // Fallback: mainnet first-mission audit artifact
    const auditPath = resolve(
      process.cwd(),
      "../../deployments/mainnet/first-mission-audit.json",
    );
    if ((id === "1" || id === "mainnet-1") && existsSync(auditPath)) {
      const audit = JSON.parse(readFileSync(auditPath, "utf8")) as {
        rankings: unknown[];
        evaluation: unknown;
        revealedCriteria: string;
        play: unknown;
      };
      return audit;
    }
    return null;
  }

  async seedDemoData(): Promise<{ seeded: boolean; count: number }> {
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
        status, criteria_commitment, rubric_id, hidden_criteria, salt
      ) VALUES
      ($1,1,'harbor','Harbor Manifest','Recover the shipment manifest without raising alarms.','daily',$2,$3,'1000000000000000','1000000000000000',100,'settled',$4,'default-v1',$5,$6),
      ($7,NULL,'embassy','Embassy Shadow','Identify the courier without tipping the security detail.','weekly',$2,$8,'2000000000000000','0',100,'open',$9,'default-v1',$10,$11),
      ($12,NULL,'archive','Ash Archive Brief','Locate the redacted ledger page in the ash wing.','monthly',$2,$8,'1500000000000000','0',50,'open',$13,'default-v1',$14,$15)
      `,
      [
        "mainnet-1",
        starts,
        settledEnds,
        "0xdfe9d9eeaaf614da38003197a859033db1563302e8e33ccc1488fe495cae2361",
        "no bribes; stealth only; prefer night shift",
        "salt-1784981127599",
        "demo-embassy",
        openEnds,
        computeCriteriaCommitment("do not alert the ambassador", "salt-embassy"),
        "do not alert the ambassador",
        "salt-embassy",
        "demo-archive",
        computeCriteriaCommitment("leave no forensic trace", "salt-archive"),
        "leave no forensic trace",
        "salt-archive",
      ],
    );

    const auditPath = resolve(
      process.cwd(),
      "../../deployments/mainnet/first-mission-audit.json",
    );
    if (existsSync(auditPath)) {
      const audit = JSON.parse(readFileSync(auditPath, "utf8")) as {
        evaluation: {
          agentTokenId: string;
          playHash: string;
          total: number;
          scores: Record<string, number>;
          reasoning: string;
          modelId: string;
          promptVersion: string;
          evaluatedAt: number;
        };
        evalHash: string;
        play: unknown;
      };
      const e = audit.evaluation;
      await pool.query(
        `INSERT INTO evaluations (
          mission_id, agent_token_id, play_hash, total, scores_json, reasoning,
          eval_hash, model_id, prompt_version, evaluated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,to_timestamp($10))`,
        [
          "mainnet-1",
          e.agentTokenId,
          e.playHash,
          e.total,
          JSON.stringify(e.scores),
          e.reasoning,
          audit.evalHash,
          e.modelId,
          e.promptVersion,
          e.evaluatedAt,
        ],
      );
      await pool.query(
        `INSERT INTO plays (
          mission_id, agent_token_id, play_hash, submitted_at, sealed_json
        ) VALUES ($1,$2,$3,to_timestamp($4),$5)`,
        [
          "mainnet-1",
          e.agentTokenId,
          e.playHash,
          e.evaluatedAt,
          JSON.stringify(audit.play),
        ],
      );
    }

    const after = await pool.query(`SELECT COUNT(*)::int AS n FROM missions`);
    return {
      seeded: true,
      count: Number((after.rows[0] as { n: number }).n),
    };
  }
}
