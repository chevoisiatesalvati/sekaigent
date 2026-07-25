import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Apply SQL migrations against in-process PGlite (no Docker required). */
async function main(): Promise<void> {
  const db = new PGlite();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const dir = join(__dirname, "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(dir, file), "utf8");
    await db.exec(sql);
    await db.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [
      file,
    ]);
    console.log(`applied ${file}`);
  }

  const tables = await db.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  console.log(
    "tables:",
    tables.rows.map((r) => r.tablename).join(", "),
  );
  await db.close();
  console.log("pglite migrations complete");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
