# Sekaigent Mainnet Ops Runbook

Network: **0G Mainnet** (chain ID `16661`)  
RPC: `https://evmrpc.0g.ai`  
Explorer: https://chainscan.0g.ai

## Prerequisites

1. Copy `.env.example` → `.env` (never commit).
2. Fund three wallets with 0G: deployer, admin, evaluator relayer.
3. Fund 0G Compute ledger (MCP `compute_deposit` or SDK) before live inference.
4. Authenticate Cursor `user-0g-cc` MCP so `walletConnected: true`.

## 5.1 Deploy contracts

```bash
./scripts/deploy-mainnet.sh
```

On success, set in `.env` and `deployments/mainnet/addresses.json`:

- `SEKAI_AGENT_ADDRESS`
- `MISSION_VAULT_ADDRESS`

Verify on https://chainscan.0g.ai.

## 5.2 Mint first agent

Upload sealed private intel via `@sekaigent/sdk` `OgStorageClient.putSealedJson` (requires key), then:

```bash
export AGENT_ENCRYPTED_URI="0g://<rootHash>"
node scripts/mint-agent.mjs
```

Register public card against ERC-8004 Identity Registry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`.

## 5.3 Accept + play

1. Admin: create mission (API `/missions` or `MissionVault.createMission`).
2. Player: `acceptMission{value: fee}(missionId, tokenId)`.
3. Generate play:

```bash
node scripts/run-mission-play.mjs
```

4. Seal play to 0G Storage; `submitPlay(missionId, tokenId, playHash)`.

Use **tiny** entry fees for the first mission.

## 5.4 Reveal → evaluate → settle → audit

1. After `endsAt`: `revealCriteria(missionId, criteria, salt)`.
2. Dry-run evaluation:

```bash
node scripts/settle-mission.mjs
```

3. Broadcast:

```bash
BROADCAST=1 node scripts/settle-mission.mjs
```

4. Publish audit bundle (criteria, plays, reasonings, rankings) for public verification.
5. Confirm payout tx on chainscan.

## Pause runbook

If anything looks wrong:

1. Call `MissionVault.pause()` / `SekaiAgent` admin controls as applicable (DEFAULT_ADMIN_ROLE).
2. Stop API relayer process.
3. Do not reveal criteria until ready to evaluate fairly.
4. Use `cancelMission` only if refunds are required before settle.

## Monitoring

- Watch `MissionCreated`, `MissionAccepted`, `PlaySubmitted`, `EvaluationPosted`, `MissionSettled` via API indexer.
- Confirm 0G Storage roots with MCP `storage_info`.
- Confirm compute providers with MCP `compute_list_providers` + `compute_verify_provider` (TEE).

## Current status

See [`deployments/mainnet/status.json`](../deployments/mainnet/status.json). Broadcast steps remain blocked until deployer/relayer keys and MCP wallet funding are available in the environment.


## Live deployment (2026-07-25)

| Contract | Address |
|----------|---------|
| SekaiAgent | `0x0Ce626095BF6B1B29Bd4B374C271EB80eDB0F9e0` |
| MissionVault | `0xECEb0d92Ce37Fa48922991aFa70460D9c62666df` |

First agent tokenId `1`. First mission id `1` settled with audit at `deployments/mainnet/first-mission-audit.json`.
