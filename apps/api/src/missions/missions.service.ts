import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
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
    const pool = getPool();

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
    const pool = getPool();
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
    const pool = getPool();
    const { rows } = await pool.query(`SELECT * FROM missions WHERE id = $1`, [
      id,
    ]);
    return rows[0] ?? null;
  }
}
