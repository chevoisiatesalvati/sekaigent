CREATE TABLE IF NOT EXISTS indexer_state (
  id TEXT PRIMARY KEY,
  last_block BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO indexer_state (id, last_block)
VALUES ('mission_vault', 0)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE plays ADD COLUMN IF NOT EXISTS player_address TEXT;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS create_tx_hash TEXT;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS reveal_tx_hash TEXT;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS settle_tx_hash TEXT;
