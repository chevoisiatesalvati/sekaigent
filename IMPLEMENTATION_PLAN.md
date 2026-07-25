# Sekaigent MVP — Mechanics, Architecture, Phased Implementation

**Sekaigent** ("sekai" = world + agent): players are masters of secret agents. MVP loop: **recruit agents → accept admin missions from a world map lobby → submit a sealed MissionPlay → compete for prize-pool rankings → audit public reasonings after close**.

## Locked defaults

- Map = stylized world lobby (no tile movement)
- Missions = admin-created only
- Identity = ERC-7857 Agentic ID + ERC-8004; ENS deferred
- Evaluation = commit–reveal criteria + structured MissionPlay + shared rubric grader
- Network = **0G Mainnet only** (no Galileo testnet path)
- Process = phases/subphases; **one git commit at the end of every subphase**
- Keep this file in sync with [`cursor_project_rules/implementation-plan.mdc`](cursor_project_rules/implementation-plan.mdc)

---

## 0G Mainnet targets

| Parameter | Value |
|-----------|-------|
| Network | 0G Mainnet (Aristotle) |
| Chain ID | `16661` (`0x4115`) |
| Native token | 0G |
| RPC | `https://evmrpc.0g.ai` |
| Storage indexer (turbo) | `https://indexer-storage-turbo.0g.ai` |
| Explorer | `https://chainscan.0g.ai` |
| ERC-8004 Identity Registry | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| ERC-8004 Reputation Registry | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` |
| Storage Flow | `0x62D4144dB0F0a6fBBaeb6296c785C71B3D57C526` |

Stack:

- **0G Chain** — `SekaiAgent` (ERC-7857) + `MissionVault`
- **0G Storage** — encrypted agent metadata, sealed plays, criteria blobs, evaluations
- **0G Compute** — MissionPlay generation + rubric evaluation (TEE preferred)
- **0G MCP (`user-0g-cc`)** — `system_ping`, `compute_*`, `storage_info` during impl/ops

Mainnet caution: tiny entry fees, pause on contracts, separate deployer/admin/relayer keys, never commit real keys.

---

## Secrets and ignore rules

Root `.gitignore` excludes `.env`, keys, keystores, `node_modules`, build artifacts, Foundry `broadcast/`, etc. Ship `.env.example` with placeholders only.

---

## Core game definitions

### Secret Agent (ERC-7857 Agentic ID)

Public card: `name`, `codename`, `portrait`, `archetype`, `publicSummary`, `level`, `xp`, `missionCount`, `winRate`, `tokenId`, `agentId`, owner wallet.

Private intelligence (encrypted on 0G Storage): `personality`, `skills` (0–100: infiltration, socialEngineering, forgery, surveillance, exfiltration, tech, combatRestraint), `behaviorRules`, `memoryDigest`.

### Mission

```ts
type MissionDuration = "daily" | "weekly" | "monthly";

type Mission = {
  id: string;
  regionId: string;
  title: string;
  publicBrief: string;
  duration: MissionDuration;
  startsAt: number;
  endsAt: number;
  entryFeeWei: string;
  prizePoolWei: string;
  maxEntrants: number;
  status: "scheduled" | "open" | "evaluating" | "settled" | "cancelled";
  criteriaCommitment: `0x${string}`; // keccak256(hiddenCriteria || salt)
  rubricId: string;
  hiddenCriteria?: string; // revealed after endsAt
  salt?: string;
};
```

### MissionPlay

```ts
type MissionPlay = {
  missionId: string;
  agentTokenId: string;
  approach: string;
  steps: Array<{ action: string; detail: string }>; // 3–8
  risksAccepted: string[];
  resourcesUsed: string[];
  contingencies: string[];
  finalOutcomeClaim: string;
  playHash: `0x${string}`;
  submittedAt: number;
};
```

### Rubric (total 100)

| Dimension | Max |
|-----------|-----|
| `objectiveFit` | 30 |
| `constraintCompliance` | 25 |
| `tradecraftQuality` | 25 |
| `characterConsistency` | 20 |

### Payouts

Rank by total desc; ties → earlier `submittedAt`. Pool = entry fees. Top-10: 40/20/12/8/6 + 14% across ranks 6–10. Fewer than 5 entrants → 50/30/20.

---

## Mission lifecycle

1. Admin stores encrypted hiddenCriteria; creates mission with `criteriaCommitment`
2. Player accepts (pays fee), generates MissionPlay via 0G Compute, submits `playHash`
3. After `endsAt`, admin reveals criteria+salt; verify hash
4. Evaluator scores each play; posts scores on-chain
5. Settle → payouts; plays + reasonings become public

Fairness: same model + promptVersion, temperature 0, seed = `keccak256(missionId, agentTokenId, playHash)`.

---

## Monorepo layout

```text
sekaigent/
  IMPLEMENTATION_PLAN.md
  .gitignore
  .env.example
  cursor_project_rules/
  apps/web/
  apps/api/
  packages/game-schemas/
  packages/sdk/
  contracts/
  docs/
  deployments/mainnet/
```

---

## Commit convention

```text
<phase>.<sub>: <imperative why-focused summary>
```

One commit per subphase after acceptance checks pass. Never commit secrets.

---

## Phased implementation status

### Phase 0 — Foundation

| Sub | Work | Status |
|-----|------|--------|
| **0.1** | Write root IMPLEMENTATION_PLAN.md | Done |
| **0.2** | Root `.gitignore` + `.env.example` | Done |
| **0.3** | `cursor_project_rules/` KB | Done |
| **0.4** | Monorepo workspaces scaffold | Done |
| **0.5** | `packages/game-schemas` Zod/TS + tests | Done |

### Phase 1 — Contracts (0G Mainnet)

| Sub | Work | Status |
|-----|------|--------|
| **1.1** | Foundry + mainnet config | Done |
| **1.2** | SekaiAgent ERC-7857 mint | Done |
| **1.3** | MissionVault lifecycle | Done |
| **1.4** | Evaluation settle and payouts | Done |
| **1.5** | Mainnet deploy scripts | Done |

### Phase 2 — Backend API

| Sub | Work | Status |
|-----|------|--------|
| **2.1** | NestJS + Postgres models | Done |
| **2.2** | Admin mission authoring | Done |
| **2.3** | Chain event indexer | Done |
| **2.4** | Evaluator relayer | Done |

### Phase 3 — Play + Eval

| Sub | Work | Status |
|-----|------|--------|
| **3.1** | 0G Storage SDK helpers | Done |
| **3.2** | MissionPlay generator | Done |
| **3.3** | Rubric evaluator | Done |
| **3.4** | Evaluate and settle pipeline | Done |

### Phase 4 — Frontend

| Sub | Work | Status |
|-----|------|--------|
| **4.1** | Next.js + wagmi mainnet | Pending |
| **4.2** | World Map Lobby | Pending |
| **4.3** | Mission detail and rankings | Pending |
| **4.4** | Agent Studio | Pending |
| **4.5** | Admin console | Pending |

### Phase 5 — Mainnet launch E2E

| Sub | Work | Status |
|-----|------|--------|
| **5.1** | Deploy contracts to mainnet | Pending |
| **5.2** | Mint first mainnet agent | Pending |
| **5.3** | First mission accept and play | Pending |
| **5.4** | Settle and publish audit | Pending |
| **5.5** | Mainnet ops runbook | Pending |

---

## Out of MVP scope

Tile exploration, player-created missions, ENS, marketplace UI, live agent↔evaluator chat, protocol fee, complex skill trees, Galileo testnet support.

---

## Progress log

### 0.1 — Done

Added root IMPLEMENTATION_PLAN.md with mechanics, architecture, 0G mainnet targets, and phased subphase checklist.
Initialized git repository for subphase commits.

### 0.2 — Done

Expanded .gitignore for secrets, keys, build artifacts, and Foundry broadcast.
Added .env.example with 0G mainnet placeholders only (no real keys).

### 0.3 — Done

Added cursor_project_rules knowledge base (overview, mechanics, architecture, implementation-plan).
KB alwaysApply rules align agents to mainnet MVP scope.

### 0.4 — Done

Scaffolded npm workspaces (apps/web, apps/api, packages/game-schemas, packages/sdk) plus contracts/docs/deployments.
Workspace install completes cleanly with shared tsconfig.base.json.

### 0.5 — Done

Implemented Zod schemas for Agent, Mission, MissionPlay, MissionEvaluation, rubric maxes, and payout BPS.
Unit tests cover parse/reject paths for each schema.

### 1.1 — Done

Initialized Foundry in contracts/ with solc 0.8.24, remappings, forge-std, and OpenZeppelin.
Configured RPC endpoint placeholder for 0G Mainnet (chain ID 16661); forge build passes.

### 1.2 — Done

Implemented SekaiAgent with ERC-7857-style mint (encryptedURI + metadataHash), roles, and authorizeUsage.
Unit tests cover mint metadata getters and non-minter revert.

### 1.3 — Done

Implemented MissionVault create/accept/submit/reveal with criteria commitment checks and fee pool accounting.
Lifecycle tests cover prize pool growth, reveal mismatch revert, and single play submission.

### 1.4 — Done

Added postEvaluation, settle with top-10 and small-field payout BPS, pause, and EVALUATOR_RELAYER role.
Settle tests cover 3-entrant 50/30/20 split, tie-break by submit time, 5-entrant renormalization, and pause.

### 1.5 — Done

Added Deploy.s.sol, ERC8004RegisterStub, deployments/mainnet address placeholders + ABIs, and deploy docs.
Local forge script dry-run succeeds; mainnet broadcast deferred to Phase 5.

### 2.1 — Done

Bootstrapped NestJS API with Postgres schema (missions/entrants/plays/evaluations/events) and docker-compose.
Migrations apply via PGlite locally when Docker is unavailable; health endpoint module builds clean.

### 2.2 — Done

Added admin-guarded mission authoring with criteria commitment matching Solidity abi.encodePacked.
Commitment helper verified against cast keccak; create mission returns commitment for on-chain createMission.

### 2.3 — Done

Added chain event indexer service with fixture ingest for MissionCreated/Accepted/PlaySubmitted/Settled.
Fixture test proves event rows persist in the indexed_events table.

### 2.4 — Done

Wired evaluator relayer dry-run builders for postEvaluation and settle (encode calldata, no broadcast).
Relayer key read from env only; unit tests cover calldata encoding.

### 3.1 — Done

Added AES-GCM sealed JSON helpers plus MemoryStorage and OgStorageClient (0G mainnet indexer).
Sealed round-trip tests pass; live mainnet upload requires funded DEPLOYER_PRIVATE_KEY (MCP wallet not connected yet).

### 3.2 — Done

Implemented MissionPlay offline generator with Zod validation and playHash (0G Compute prompts ready; MCP wallet pending).
Golden fixture test produces schema-valid plays from brief + agent intel.

### 3.3 — Done

Implemented deterministic rubric evaluator with promptVersion rubric-v1 and bribe/stealth penalties.
Fixture tests keep scores within rubric bounds.
