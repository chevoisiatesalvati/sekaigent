import { getPool, closePool } from "./pool.js";

async function migrate(): Promise<void> {
  await getPool();
  console.log("migrations complete");
}

migrate()
  .then(async () => {
    await closePool();
  })
  .catch(async (error) => {
    console.error(error);
    await closePool();
    process.exit(1);
  });
