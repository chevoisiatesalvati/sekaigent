#!/usr/bin/env bash
# Start Nest API (:3001) and Next web (:3000) together.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

API_PID=""
WEB_PID=""

cleanup() {
  if [[ -n "${API_PID}" ]] && kill -0 "${API_PID}" 2>/dev/null; then
    kill "${API_PID}" 2>/dev/null || true
  fi
  if [[ -n "${WEB_PID}" ]] && kill -0 "${WEB_PID}" 2>/dev/null; then
    kill "${WEB_PID}" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
}

trap cleanup EXIT INT TERM

echo "→ API  http://localhost:3001"
npm run dev:api &
API_PID=$!

echo "→ Web  http://localhost:3000"
npm run dev:web &
WEB_PID=$!

echo "Both running (Ctrl+C stops both)."
wait
