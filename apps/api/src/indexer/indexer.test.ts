import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("indexer fixtures", () => {
  it("stores MissionCreated/Accepted/PlaySubmitted/Settled events", async () => {
    const db = new PGlite();
    const sql = readFileSync(
      join(__dirname, "../db/migrations/001_init.sql"),
      "utf8",
    );
    await db.exec(sql);

    const events = [
      "MissionCreated",
      "MissionAccepted",
      "PlaySubmitted",
      "MissionSettled",
    ];

    for (let i = 0; i < events.length; i++) {
      await db.query(
        `INSERT INTO indexed_events (tx_hash, log_index, event_name, payload_json, block_number)
         VALUES ($1,$2,$3,$4,$5)`,
        [
          `0x${"ab".repeat(32)}`,
          i,
          events[i],
          JSON.stringify({ missionId: "1" }),
          "100",
        ],
      );
    }

    const { rows } = await db.query<{ event_name: string }>(
      `SELECT event_name FROM indexed_events ORDER BY log_index`,
    );
    assert.deepEqual(
      rows.map((r) => r.event_name),
      events,
    );
    await db.close();
  });
});
