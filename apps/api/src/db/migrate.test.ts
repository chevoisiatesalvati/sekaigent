import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("migrations", () => {
  it("includes init SQL with core tables", () => {
    const dir = join(__dirname, "migrations");
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql"));
    assert.ok(files.includes("001_init.sql"));
    const sql = readFileSync(join(dir, "001_init.sql"), "utf8");
    assert.match(sql, /CREATE TABLE IF NOT EXISTS missions/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS entrants/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS plays/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS evaluations/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS indexed_events/);
  });
});
