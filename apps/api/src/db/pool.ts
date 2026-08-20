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
let activeMode: "pglite" | "postgres" = "postgres";

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

function isUnreachablePostgresError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = "code" in err ? String(err.code) : "";
  return (
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "ECONNRESET" ||
    code === "ENOENT" ||
    code === "57P03" // cannot_connect_now
  );
}

function pgliteDataDir(): string {
  if (process.env.PGLITE_DATA_DIR) return process.env.PGLITE_DATA_DIR;
  // Vercel/serverless: only /tmp is writable; repo-relative .data is not.
  if (process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return join("/tmp", "sekaigent-pglite");
  }
  return join(__dirname, "../../.data/pglite");
}

async function openPglite(): Promise<DbClient> {
  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir = pgliteDataDir();
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
  activeMode = "pglite";
  client = wrapped;
  return client;
}

async function openPostgres(): Promise<DbClient> {
  const pg = await import("pg");
  const pool = new pg.default.Pool({ connectionString: config.databaseUrl });
  pgPool = pool;
  const wrapped: DbClient = {
    async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const result = await pool.query(sql, params);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
  };
  // Probe connectivity before declaring postgres ready
  await wrapped.query("SELECT 1 AS ok");
  await ensureMigrations(wrapped);
  activeMode = "postgres";
  client = wrapped;
  return client;
}

export async function getPool(): Promise<DbClient> {
  if (client) return client;

  if (wantsPglite()) {
    return openPglite();
  }

  try {
    return await openPostgres();
  } catch (err) {
    if (!isUnreachablePostgresError(err)) throw err;
    if (pgPool) {
      await pgPool.end().catch(() => undefined);
      pgPool = null;
    }
    // Serverless: never fall back to ephemeral PGlite (data loss + often unwritable FS).
    if (process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      const hint =
        config.databaseUrl.includes("localhost") ||
        config.databaseUrl.includes("127.0.0.1")
          ? "DATABASE_URL points at localhost — set a hosted Postgres URL (e.g. Neon) on the Vercel project."
          : "Check DATABASE_URL / network access for hosted Postgres.";
      throw new Error(
        `[db] Postgres unreachable on serverless (${config.databaseUrl.split("@").pop() ?? "unknown"}). ${hint}`,
      );
    }
    console.warn(
      `[db] Postgres unreachable (${config.databaseUrl}); falling back to embedded PGlite. ` +
        `Start docker compose up -d for Postgres, or set DATABASE_URL=pglite.`,
    );
    return openPglite();
  }
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
  activeMode = wantsPglite() ? "pglite" : "postgres";
}

export function dbMode(): "pglite" | "postgres" {
  return activeMode;
}

/** Used only to silence unused import lint if existsSync needed later */
void existsSync;
