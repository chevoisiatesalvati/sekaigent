# Sekaigent

Secret-agent mission game on **0G Mainnet**. Players own ERC-7857 Agentic IDs (“secret agents”), accept admin missions from a world-map lobby, submit sealed MissionPlays, and compete for prize-pool rankings with public audit after settle.

See [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) for mechanics, architecture, and phased status (through **Phase 11 — live integration**).

## Quick start

```bash
cp .env.example .env
# fill .env (see below)

npm install
npm run build --workspace=@sekaigent/game-schemas
npm run build --workspace=@sekaigent/sdk

# optional local infra
docker compose up -d   # Postgres + Redis (if Docker available)

# API + web together (from repo root)
npm run dev

# or separately:
# npm run dev --workspace=@sekaigent/api
# npm run dev --workspace=@sekaigent/web
```

For local practice without chain/indexer data, set `SEED_DEMO=1` and `NEXT_PUBLIC_USE_MOCKS=1`. Live-first defaults leave both off.

Contracts (Foundry):

```bash
cd contracts && forge build && forge test
./scripts/deploy-mainnet.sh   # needs DEPLOYER_PRIVATE_KEY
```

## Environment variables

Copy [`.env.example`](.env.example) → `.env`. **Never commit `.env`.**

### 0G network (public — copy as-is for mainnet)

| Variable | What it is | Where to get it |
|----------|------------|-----------------|
| `OG_RPC_URL` | JSON-RPC endpoint for 0G Mainnet | Official: `https://evmrpc.0g.ai` ([Mainnet overview](https://docs.0g.ai/developer-hub/mainnet/mainnet-overview)). For production you can use a private RPC from QuickNode / Thirdweb / Ankr. |
| `OG_STORAGE_INDEXER` | 0G Storage turbo indexer URL | Official: `https://indexer-storage-turbo.0g.ai` (same docs). |
| `OG_CHAIN_ID` | Chain ID | Always `16661` for 0G Mainnet. |
| `OG_EXPLORER_URL` | Block explorer base URL | `https://chainscan.0g.ai` |

### ERC-8004 registries (public — already set)

| Variable | What it is | Where to get it |
|----------|------------|-----------------|
| `ERC8004_IDENTITY_REGISTRY` | On-chain agent identity registry | 0G docs: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` ([ERC-8004 on 0G](https://docs.0g.ai/developer-hub/building-on-0g/agentic-id/erc8004)) |
| `ERC8004_REPUTATION_REGISTRY` | On-chain reputation registry | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` (same page) |

### Your deployed contracts

| Variable | What it is | Where to get it |
|----------|------------|-----------------|
| `SEKAI_AGENT_ADDRESS` | Address of `SekaiAgent` | Live: `0x4bb6436cf22befdd7cC65000BeC62e4CB21A2974` — also `deployments/mainnet/addresses.json`. Verify on [chainscan](https://chainscan.0g.ai). |
| `MISSION_VAULT_ADDRESS` | Address of `MissionVault` | Live: `0x27137e33D0AF7cE24ACc057F2A9F09aEa5bd478b`. Indexer/settle/admin txs use this. |

### Private keys (you create — never share or commit)

Use **separate** wallets for safety. Export the private key from your wallet (MetaMask → Account details → Show private key) or generate with Foundry:

```bash
cast wallet new
```

| Variable | Role | Where to get it / how to fund |
|----------|------|-------------------------------|
| `DEPLOYER_PRIVATE_KEY` | Deploys contracts; usually also has `MINTER_ROLE` at first; fallback for storage uploads | New wallet you control. Fund with **0G** on mainnet for gas. |
| `ADMIN_PRIVATE_KEY` | Nest broadcasts `createMission` + `revealCriteria` (`ADMIN_ROLE`) | Separate wallet granted `ADMIN_ROLE`. Fund with 0G for gas. |
| `EVALUATOR_RELAYER_PRIVATE_KEY` | Nest settle job: `postEvaluation` / `settle` | Separate wallet granted `EVALUATOR_RELAYER_ROLE`. Fund with 0G for gas. Never expose to the browser. |
| `STORAGE_PRIVATE_KEY` | Funds `POST /storage/seal-agent` and `seal-play` uploads to 0G Storage | Optional; defaults to `DEPLOYER_PRIVATE_KEY` when unset. |

**Format:** hex private key, with or without `0x` prefix (scripts normalize).  
**Also set (optional helpers used by deploy script):**

| Variable | What it is |
|----------|------------|
| `ADMIN_ADDRESS` | Checksum address of admin (if different from deployer); also used by API `AdminGuard` |
| `RELAYER_ADDRESS` | Checksum address of relayer (if different from deployer) |

These are read by `contracts/script/Deploy.s.sol` via `vm.envOr`.

### API / local services

| Variable | What it is | Where to get it |
|----------|------------|-----------------|
| `DATABASE_URL` | Postgres connection string | Local: `postgresql://sekaigent:sekaigent@localhost:5432/sekaigent` matches `docker-compose.yml`. API falls back to PGlite when Docker/Postgres is unavailable. |
| `REDIS_URL` | Redis URL for job queues | Local: `redis://localhost:6379` from compose, or omit until workers need it. |
| `API_PORT` | HTTP port for Nest API | Choose freely; default `3001`. |
| `ADMIN_JWT_SECRET` | Secret used to HMAC-mint admin API bearer tokens | Long random string you invent, e.g. `openssl rand -hex 32`. Not a blockchain key. |
| `ADMIN_ADDRESS` | (API) lowercase admin wallet used with the HMAC token | Same admin address as on-chain. Required for `AdminGuard`. |
| `AGENT_SEAL_PASSWORD` | AES-GCM password for sealed agent intel | Shared ops secret; default in `.env.example` is for local only. |
| `PLAY_SEAL_PASSWORD` | AES-GCM password for sealed MissionPlays | Same — change for production. |

Admin API token (for `/missions` POST and reveal):

```bash
# token = HMAC-SHA256(adminAddressLowercase, ADMIN_JWT_SECRET) as hex
node -e "const {createHmac}=require('crypto'); console.log(createHmac('sha256', process.env.ADMIN_JWT_SECRET).update(process.env.ADMIN_ADDRESS.toLowerCase()).digest('hex'))"
```

### Indexer + settle job

| Variable | Default | What it is |
|----------|---------|------------|
| `INDEXER_ENABLED` | `1` | Poll MissionVault logs and upsert missions / entrants / plays |
| `INDEXER_POLL_MS` | `15000` | Poll interval |
| `INDEXER_START_BLOCK` | `0` | Backfill from this block (set to deploy block on first run) |
| `INDEXER_CHUNK_SIZE` | `2000` | Max blocks per `eth_getLogs` chunk |
| `SETTLE_JOB_ENABLED` | `1` | After reveal: Router rubric → `postEvaluation` → `settle` |
| `SETTLE_JOB_MS` | `30000` | Settle job interval |

### Demo / practice gates (live-first defaults **off**)

| Variable | Default | What it is |
|----------|---------|------------|
| `SEED_DEMO` | `0` | When `1`, API seeds local demo missions if DB is empty (never collides with live `on_chain_id`) |
| `NEXT_PUBLIC_USE_MOCKS` | `0` | When `1`, web falls back to `MOCK_MISSIONS`, demo squad seed, and soft local mint/seal |
| `ALLOW_OFFLINE_ORDERS` | `1` | When `1`, `/play/suggest` may assemble offline if Router is missing/fails; set `0` for Router-only |

### Frontend (`NEXT_PUBLIC_*` — exposed to the browser)

| Variable | What it is | Where to get it |
|----------|------------|-----------------|
| `NEXT_PUBLIC_API_URL` | Browser-facing API base URL | Local: `http://localhost:3001`. Production: your API HTTPS URL. |
| `NEXT_PUBLIC_OG_CHAIN_ID` | Chain id for wagmi | `16661` |
| `NEXT_PUBLIC_OG_RPC_URL` | RPC the wallet/dapp uses | Same as `OG_RPC_URL` or a public/private RPC you prefer. |
| `NEXT_PUBLIC_USE_MOCKS` | Practice mocks (see above) | `0` for live; `1` for desk/demo UI |

### 0G Compute Router (suggest + eval)

| Variable | What it is | Where to get it |
|----------|------------|-----------------|
| `OG_COMPUTE_ROUTER_BASE_URL` | OpenAI-compatible Router API | Default `https://router-api.0g.ai/v1` |
| `OG_COMPUTE_ROUTER_API_KEY` | Router API key for Nest suggest + settle rubric | Create/fund at [pc.0g.ai](https://pc.0g.ai) — independent from Direct/MCP ledger balances |
| `OG_COMPUTE_MODEL` | Model id | Default `zai-org/GLM-5-FP8` |

Used by:

- `POST /play/suggest` — guided mission orders
- Settle job — live rubric (temp 0, seeded); offline rubric fallback when Router unavailable

For storage uploads / Cursor MCP ops: funded wallet + optional `user-0g-cc` auth.

See [`docs/0g-compute-mcp.md`](docs/0g-compute-mcp.md) and [`docs/mainnet-ops.md`](docs/mainnet-ops.md).

## Live player loop (Phase 11)

1. **Bureau Ops** → `POST /missions` (admin JWT) → Nest broadcasts `createMission` → indexer sets `on_chain_id`
2. **Recruit** → `POST /storage/seal-agent` → mint with `0g://` URI (minter role)
3. **Orders** → Router suggest → seal play → `acceptMission` + `submitPlay` → Field via `/field?address=`
4. **After deadline** → `POST /missions/:id/reveal` → settle job grades + settles → Debrief `/missions/:id/audit`

## Cursor rules

Project rules live in [`.cursor/rules/`](.cursor/rules/) (Cursor’s standard location). They are always-applied `.mdc` files for product scope, mechanics, architecture, and the implementation checklist.

## Monorepo layout

```text
apps/web          Next.js + wagmi (0G Mainnet) — fixed game shell
apps/api          NestJS API (missions, indexer, storage, play, settle)
packages/game-schemas
packages/sdk      0G storage/compute + play/eval/orders
contracts/        Foundry (SekaiAgent, MissionVault)
deployments/mainnet/
docs/
scripts/
```

## Live 0G Mainnet deployment

| Contract | Address |
|----------|---------|
| SekaiAgent | [`0x4bb6436cf22befdd7cC65000BeC62e4CB21A2974`](https://chainscan.0g.ai/address/0x4bb6436cf22befdd7cC65000BeC62e4CB21A2974) |
| MissionVault | [`0x27137e33D0AF7cE24ACc057F2A9F09aEa5bd478b`](https://chainscan.0g.ai/address/0x27137e33D0AF7cE24ACc057F2A9F09aEa5bd478b) |

Admin / relayer: `0x8dA01238985992E63Bd09EBF05963f10683c3378`  
Ops runbook: [`docs/mainnet-ops.md`](docs/mainnet-ops.md)  
(`first-*` artifacts document the superseded 2026-07-25 deploy.)

## Safety

- Never commit private keys or `.env`
- Prefer distinct keys (deployer / admin / relayer / storage)
- Keep `SEED_DEMO` and `NEXT_PUBLIC_USE_MOCKS` off in production
- Start with **tiny** mission entry fees on mainnet
- Keep `MissionVault.pause()` available if something looks wrong
