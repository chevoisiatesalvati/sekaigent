import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Load monorepo root .env when running from apps/api
const rootEnv = resolve(process.cwd(), "../../.env");
const localEnv = resolve(process.cwd(), ".env");
if (existsSync(rootEnv)) loadDotenv({ path: rootEnv });
else if (existsSync(localEnv)) loadDotenv({ path: localEnv });
else loadDotenv();

export const config = {
  port: Number(process.env.API_PORT ?? 3001),
  // Prefer Docker Compose Postgres; set DATABASE_URL=pglite or USE_PGLITE=1 for embedded fallback
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgresql://sekaigent:sekaigent@localhost:5432/sekaigent",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  adminJwtSecret: process.env.ADMIN_JWT_SECRET ?? "change-me",
  adminAddress: (process.env.ADMIN_ADDRESS ?? "").toLowerCase(),
  ogRpcUrl: process.env.OG_RPC_URL ?? "https://evmrpc.0g.ai",
  ogChainId: Number(process.env.OG_CHAIN_ID ?? 16661),
  missionVaultAddress: (process.env.MISSION_VAULT_ADDRESS ??
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
  sekaiAgentAddress: (process.env.SEKAI_AGENT_ADDRESS ??
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
  relayerPrivateKey: process.env.EVALUATOR_RELAYER_PRIVATE_KEY as
    | `0x${string}`
    | undefined,
};
