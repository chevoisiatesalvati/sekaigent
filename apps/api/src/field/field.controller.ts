import { Controller, Get, Query } from "@nestjs/common";
import { getPool } from "../db/pool.js";

@Controller("field")
export class FieldController {
  @Get()
  async list(@Query("address") address: string) {
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return { deployments: [] };
    }
    const pool = await getPool();
    const { rows } = await pool.query(
      `SELECT m.id AS mission_id, m.title AS mission_title, m.on_chain_id,
              m.status AS mission_status, e.agent_token_id, e.player_address,
              p.play_hash
       FROM entrants e
       JOIN missions m ON m.id = e.mission_id
       LEFT JOIN plays p ON p.mission_id = e.mission_id
         AND p.agent_token_id = e.agent_token_id
       WHERE lower(e.player_address) = lower($1)
       ORDER BY m.ends_at DESC`,
      [address],
    );
    return {
      deployments: rows.map((row) => ({
        missionId: String(row.mission_id),
        missionTitle: String(row.mission_title),
        onChainId:
          row.on_chain_id != null ? String(row.on_chain_id) : null,
        status: String(row.mission_status),
        agentTokenId: String(row.agent_token_id),
        playHash: row.play_hash ? String(row.play_hash) : null,
        playerAddress: row.player_address
          ? String(row.player_address)
          : null,
      })),
    };
  }
}
