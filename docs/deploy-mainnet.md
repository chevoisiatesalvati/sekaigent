# Deploy to 0G Mainnet

## Prerequisites

1. Fund deployer / admin / relayer wallets with 0G on mainnet (chain ID 16661).
2. Copy `.env.example` → `.env` and set keys (never commit `.env`).
3. Set `OG_RPC_URL=https://evmrpc.0g.ai`.

## Dry run (no broadcast)

```bash
cd contracts
source ../.env
forge script script/Deploy.s.sol:DeployScript --rpc-url "$OG_RPC_URL" -vv
```

## Broadcast (Phase 5.1)

```bash
cd contracts
source ../.env
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url "$OG_RPC_URL" \
  --broadcast \
  -vv
```

Copy printed addresses into `deployments/mainnet/addresses.json`. Export ABIs from `contracts/out/` into `deployments/mainnet/` as needed (no keys).

## ERC-8004

After minting an agent, the API registers a public agent card against the Identity Registry at `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` using the `sekaigent://agent/{tokenId}` URI convention (`ERC8004RegisterStub`).
