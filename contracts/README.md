# Sekaigent Contracts

Foundry project targeting **0G Mainnet** (chain ID `16661`).

## Network

| Parameter | Value |
|-----------|-------|
| RPC | `https://evmrpc.0g.ai` (or `OG_RPC_URL`) |
| Chain ID | 16661 |
| Explorer | https://chainscan.0g.ai |

## Commands

```bash
forge build
forge test
forge script script/Deploy.s.sol --rpc-url $OG_RPC_URL --broadcast
```

Do not commit private keys. Use `.env` at repo root (gitignored).
