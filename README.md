# Sekaigent

Secret-agent mission game on **0G Mainnet**. Players own ERC-7857 Agentic IDs (“secret agents”), accept admin missions from a world-map lobby, submit sealed MissionPlays, and compete for prize-pool rankings with public audit after settle.

See [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) for mechanics, architecture, and phased status.

## Quick start

```bash
cp .env.example .env
# fill .env (see below)

npm install
npm run build --workspace=@sekaigent/game-schemas
npm run build --workspace=@sekaigent/sdk

# optional local infra
docker compose up -d   # Postgres + Redis (if Docker available)

# API
npm run migration:pglite --workspace=@sekaigent/api   # or migration:run with Postgres
npm run dev --workspace=@sekaigent/api

# Web
npm run dev --workspace=@sekaigent/web
```

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

### Your deployed contracts (empty until you deploy)

| Variable | What it is | Where to get it |
|----------|------------|-----------------|
| `SEKAI_AGENT_ADDRESS` | Address of `SekaiAgent` after deploy | Output of `./scripts/deploy-mainnet.sh` / Foundry broadcast; also paste into `deployments/mainnet/addresses.json`. Verify on [chainscan](https://chainscan.0g.ai). |
| `MISSION_VAULT_ADDRESS` | Address of `MissionVault` after deploy | Same as above. |

### Private keys (you create — never share or commit)

Use **separate** wallets for safety. Export the private key from your wallet (MetaMask → Account details → Show private key) or generate with Foundry:

```bash
cast wallet new
```

| Variable | Role | Where to get it / how to fund |
|----------|------|-------------------------------|
| `DEPLOYER_PRIVATE_KEY` | Deploys contracts; usually also has `MINTER_ROLE` at first | New wallet you control. Fund with **0G** on mainnet for gas. Faucet/docs: [0G Mainnet](https://docs.0g.ai/developer-hub/mainnet/mainnet-overview) (mainnet 0G is real value — start with a small amount). |
| `ADMIN_PRIVATE_KEY` | Game admin: create/reveal missions (`ADMIN_ROLE`) | Separate wallet. Must be the address granted `ADMIN_ROLE` (deploy script defaults admin to deployer unless `ADMIN_ADDRESS` is set). Fund with 0G for gas. |
| `EVALUATOR_RELAYER_PRIVATE_KEY` | Backend hot wallet: `postEvaluation` / `settle` | Separate wallet granted `EVALUATOR_RELAYER_ROLE`. Fund with 0G for gas. Used only by the API/scripts — keep offline from the browser. |

**Format:** hex private key, with or without `0x` prefix (scripts normalize).  
**Also set (optional helpers used by deploy script):**

| Variable | What it is |
|----------|------------|
| `ADMIN_ADDRESS` | Checksum address of admin (if different from deployer) |
| `RELAYER_ADDRESS` | Checksum address of relayer (if different from deployer) |

These are read by `contracts/script/Deploy.s.sol` via `vm.envOr`.

### API / local services

| Variable | What it is | Where to get it |
|----------|------------|-----------------|
| `DATABASE_URL` | Postgres connection string | Local: `postgresql://sekaigent:sekaigent@localhost:5432/sekaigent` matches `docker-compose.yml`. Or any Postgres you host. |
| `REDIS_URL` | Redis URL for job queues | Local: `redis://localhost:6379` from compose, or omit until workers need it. |
| `API_PORT` | HTTP port for Nest API | Choose freely; default `3001`. |
| `ADMIN_JWT_SECRET` | Secret used to HMAC-mint admin API bearer tokens | Long random string you invent, e.g. `openssl rand -hex 32`. Not a blockchain key. |
| `ADMIN_ADDRESS` | (API) lowercase admin wallet used with the HMAC token | Same admin address as on-chain. Required for `AdminGuard`. |

Admin API token (for `/missions` POST):

```bash
# token = HMAC-SHA256(adminAddressLowercase, ADMIN_JWT_SECRET) as hex
node -e "const {createHmac}=require('crypto'); console.log(createHmac('sha256', process.env.ADMIN_JWT_SECRET).update(process.env.ADMIN_ADDRESS.toLowerCase()).digest('hex'))"
```

### Frontend (`NEXT_PUBLIC_*` — exposed to the browser)

| Variable | What it is | Where to get it |
|----------|------------|-----------------|
| `NEXT_PUBLIC_API_URL` | Browser-facing API base URL | Local: `http://localhost:3001`. Production: your API HTTPS URL. |
| `NEXT_PUBLIC_OG_CHAIN_ID` | Chain id for wagmi | `16661` |
| `NEXT_PUBLIC_OG_RPC_URL` | RPC the wallet/dapp uses | Same as `OG_RPC_URL` or a public/private RPC you prefer. |

### 0G Compute / Storage

For live **mission-order suggest** (`POST /play/suggest`):

- Fund the **Router** balance at [pc.0g.ai](https://pc.0g.ai) and set `OG_COMPUTE_ROUTER_API_KEY` (see `.env.example`)
- Router is independent from Direct/MCP ledger balances

For storage uploads / Cursor MCP ops: funded wallet + optional `user-0g-cc` auth.

See [`docs/0g-compute-mcp.md`](docs/0g-compute-mcp.md) and [`docs/mainnet-ops.md`](docs/mainnet-ops.md).

## Cursor rules

Project rules live in [`.cursor/rules/`](.cursor/rules/) (Cursor’s standard location). They are always-applied `.mdc` files for product scope, mechanics, architecture, and the implementation checklist.

## Monorepo layout

```text
apps/web          Next.js + wagmi (0G Mainnet)
apps/api          NestJS API
packages/game-schemas
packages/sdk      0G storage/compute + play/eval
contracts/        Foundry (SekaiAgent, MissionVault)
deployments/mainnet/
docs/
scripts/
```

## Live 0G Mainnet deployment

| Contract | Address |
|----------|---------|
| SekaiAgent | [`0x0Ce626095BF6B1B29Bd4B374C271EB80eDB0F9e0`](https://chainscan.0g.ai/address/0x0Ce626095BF6B1B29Bd4B374C271EB80eDB0F9e0) |
| MissionVault | [`0xECEb0d92Ce37Fa48922991aFa70460D9c62666df`](https://chainscan.0g.ai/address/0xECEb0d92Ce37Fa48922991aFa70460D9c62666df) |

First agent: tokenId `1` — [`deployments/mainnet/first-agent.json`](deployments/mainnet/first-agent.json)  
First mission audit: [`deployments/mainnet/first-mission-audit.json`](deployments/mainnet/first-mission-audit.json)  
Ops runbook: [`docs/mainnet-ops.md`](docs/mainnet-ops.md)

## Safety

- Never commit private keys or `.env`
- Prefer three distinct keys (deployer / admin / relayer)
- Start with **tiny** mission entry fees on mainnet
- Keep `MissionVault.pause()` available if something looks wrong
