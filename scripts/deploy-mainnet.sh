#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/contracts"

if [[ -f "$ROOT/.env" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "$ROOT/.env"
  set +a
fi

: "${OG_RPC_URL:=https://evmrpc.0g.ai}"

if [[ -z "${DEPLOYER_PRIVATE_KEY:-}" ]]; then
  echo "DEPLOYER_PRIVATE_KEY missing — cannot broadcast to 0G Mainnet."
  echo "Dry-run only:"
  DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
    forge script script/Deploy.s.sol:DeployScript -vv
  exit 2
fi

forge script script/Deploy.s.sol:DeployScript \
  --rpc-url "$OG_RPC_URL" \
  --broadcast \
  -vv

echo "Copy printed SekaiAgent/MissionVault addresses into deployments/mainnet/addresses.json"
