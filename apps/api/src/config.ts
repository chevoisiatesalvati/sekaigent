import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Load monorepo root .env when running from apps/api
const rootEnv = resolve(process.cwd(), "../../.env");
const localEnv = resolve(process.cwd(), ".env");
if (existsSync(rootEnv)) loadDotenv({ path: rootEnv });
else if (existsSync(localEnv)) loadDotenv({ path: localEnv });
else loadDotenv();

function normalizeKey(value: string | undefined): `0x${string}` | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return (trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`) as `0x${string}`;
}

function flag(name: string, defaultOn = false): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return defaultOn;
  return raw === "1" || raw.toLowerCase() === "true" || raw === "yes";
}

export const config = {
  port: Number(process.env.API_PORT ?? 3001),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgresql://sekaigent:sekaigent@localhost:5432/sekaigent",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  adminJwtSecret: process.env.ADMIN_JWT_SECRET ?? "change-me",
  adminAddress: (process.env.ADMIN_ADDRESS ?? "").toLowerCase(),
  ogRpcUrl: process.env.OG_RPC_URL ?? "https://evmrpc.0g.ai",
  ogChainId: Number(process.env.OG_CHAIN_ID ?? 16661),
  ogStorageIndexer:
    process.env.OG_STORAGE_INDEXER ?? "https://indexer-storage-turbo.0g.ai",
  missionVaultAddress: (process.env.MISSION_VAULT_ADDRESS ??
    "0x27137e33D0AF7cE24ACc057F2A9F09aEa5bd478b") as `0x${string}`,
  sekaiAgentAddress: (process.env.SEKAI_AGENT_ADDRESS ??
    "0x4bb6436cf22befdd7cC65000BeC62e4CB21A2974") as `0x${string}`,
  relayerPrivateKey: normalizeKey(process.env.EVALUATOR_RELAYER_PRIVATE_KEY),
  adminPrivateKey: normalizeKey(process.env.ADMIN_PRIVATE_KEY),
  storagePrivateKey: normalizeKey(
    process.env.STORAGE_PRIVATE_KEY ?? process.env.DEPLOYER_PRIVATE_KEY,
  ),
  agentSealPassword: process.env.AGENT_SEAL_PASSWORD ?? "sekaigent-dev-seal",
  playSealPassword: process.env.PLAY_SEAL_PASSWORD ?? "sekaigent-dev-play",
  /** Auto-seed demo missions when DB empty. Off by default for live-first. */
  seedDemo: flag("SEED_DEMO", false),
  /** Poll MissionVault logs. On by default when vault address is set. */
  indexerEnabled: flag("INDEXER_ENABLED", true),
  indexerPollMs: Number(process.env.INDEXER_POLL_MS ?? 15_000),
  indexerStartBlock: Number(process.env.INDEXER_START_BLOCK ?? 0),
  indexerChunkSize: Number(process.env.INDEXER_CHUNK_SIZE ?? 2_000),
  /** Offline orders assemble when Router fails/missing. */
  allowOfflineOrders: flag("ALLOW_OFFLINE_ORDERS", true),
  /** Run evaluate→postEvaluation→settle after reveal. */
  settleJobEnabled: flag("SETTLE_JOB_ENABLED", true),
  settleJobMs: Number(process.env.SETTLE_JOB_MS ?? 30_000),
  ogComputeRouterApiKey: process.env.OG_COMPUTE_ROUTER_API_KEY ?? "",
  ogComputeRouterBaseUrl:
    process.env.OG_COMPUTE_ROUTER_BASE_URL ?? "https://router-api.0g.ai/v1",
  ogComputeModel: process.env.OG_COMPUTE_MODEL ?? "zai-org/GLM-5-FP8",
};
