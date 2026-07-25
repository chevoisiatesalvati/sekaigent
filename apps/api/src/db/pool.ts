import { mkdirSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";

type QueryResult<T = Record<string, unknown>> = { rows: T[]; rowCount: number };

export type DbClient = {
  query: <T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ) => Promise<QueryResult<T>>;
};

let client: DbClient | null = null;
let pglite: { close: () => Promise<void>; query: Function; exec: Function; waitReady: Promise<unknown> } | null =
  null;
let pgPool: { end: () => Promise<void> } | null = null;
let migrated = false;

const __dirname = dirname(fileURLToPath(import.meta.url));

function migrationFiles(): string[] {
  const dir = join(__dirname, "migrations");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => join(dir, f));
}

async function ensureMigrations(db: DbClient & { exec?: (sql: string) => Promise<unknown> }): Promise<void> {
  if (migrated) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  for (const full of migrationFiles()) {
    const file = full.split("/").pop()!;
    const existing = await db.query(
      "SELECT 1 AS ok FROM schema_migrations WHERE filename = $1",
      [file],
    );
    if (existing.rows.length > 0) continue;
    const sql = readFileSync(full, "utf8");
    if (db.exec) await db.exec(sql);
    else await db.query(sql);
    await db.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [
      file,
    ]);
  }
  migrated = true;
}

function wantsPglite(): boolean {
  const url = config.databaseUrl;
  return (
    process.env.USE_PGLITE === "1" ||
    url === "pglite" ||
    url.startsWith("pglite:")
  );
}

export async function getPool(): Promise<DbClient> {
  if (client) return client;

  if (wantsPglite()) {
    const { PGlite } = await import("@electric-sql/pglite");
    const dataDir =
      process.env.PGLITE_DATA_DIR ?? join(__dirname, "../../.data/pglite");
    mkdirSync(dataDir, { recursive: true });
    const db = new PGlite(dataDir);
    await db.waitReady;
    pglite = db;
    const wrapped: DbClient & { exec: (sql: string) => Promise<unknown> } = {
      exec: (sql: string) => db.exec(sql),
      async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
        const result = await db.query(sql, params);
        return {
          rows: result.rows as T[],
          rowCount: result.affectedRows ?? result.rows.length,
        };
      },
    };
    await ensureMigrations(wrapped);
    client = wrapped;
    return client;
  }

  const pg = await import("pg");
  const pool = new pg.default.Pool({ connectionString: config.databaseUrl });
  pgPool = pool;
  const wrapped: DbClient = {
    async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const result = await pool.query(sql, params);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
  };
  await ensureMigrations(wrapped);
  client = wrapped;
  return client;
}

export async function closePool(): Promise<void> {
  if (pglite) {
    await pglite.close();
    pglite = null;
  }
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
  client = null;
  migrated = false;
}

export function dbMode(): "pglite" | "postgres" {
  return wantsPglite() ? "pglite" : "postgres";
}

/** Used only to silence unused import lint if existsSync needed later */
void existsSync;
