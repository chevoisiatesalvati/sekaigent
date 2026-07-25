# 0G Compute / Storage MCP notes

Use the Cursor `user-0g-cc` MCP server during implementation and ops:

| Tool | Use |
|------|-----|
| `system_ping` | Connectivity / network = 0G-Mainnet |
| `compute_list_providers` | List TEE providers before play/eval |
| `compute_verify_provider` | Attest provider before sensitive inference |
| `compute_get_balance` / `compute_deposit` | Fund compute ledger |
| `compute_inference` | Prototype play/grader prompts |
| `storage_info` | Verify uploaded root hashes |

As of Phase 3 scaffold: MCP ping OK; wallet not connected (providers empty / broker uninitialized). Offline generators in `@sekaigent/sdk` cover CI; wire live compute once wallet + deposit are configured in `.env`.
