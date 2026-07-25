# 0G Compute notes

## Game API — Router (recommended for Nest)

`POST /play/suggest` uses the **0G Compute Router** (OpenAI-compatible):

1. Visit [pc.0g.ai](https://pc.0g.ai), connect wallet, deposit 0G into the **Router** balance.
2. Create an API key with inference permission (`sk-…`).
3. Set in `.env` (see `.env.example`):

```
OG_COMPUTE_ROUTER_BASE_URL=https://router-api.0g.ai/v1
OG_COMPUTE_ROUTER_API_KEY=sk-…
OG_COMPUTE_MODEL=zai-org/GLM-5-FP8
```

Nest calls `https://router-api.0g.ai/v1/chat/completions` via the `openai` SDK (`suggestMissionPlayViaRouter` in `@sekaigent/sdk`). Missing key or request failure → offline `assembleMissionPlayFromChoices`.

Router and Direct balances are **independent**. Funding the Direct/MCP ledger does not fund Router.

## Cursor MCP — Direct / ops

Use the Cursor `user-0g-cc` MCP server during implementation and ops (not from the browser):

| Tool | Use |
|------|-----|
| `system_ping` | Connectivity / network = 0G-Mainnet |
| `compute_list_providers` | List TEE providers before play/eval |
| `compute_verify_provider` | Attest provider before sensitive inference |
| `compute_get_balance` / `compute_deposit` | Fund Direct compute ledger |
| `compute_inference` | Prototype play/grader prompts |
| `storage_info` | Verify uploaded root hashes |

Offline generators in `@sekaigent/sdk` cover CI when Router is unset.
