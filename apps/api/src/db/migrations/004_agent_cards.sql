CREATE TABLE IF NOT EXISTS agent_cards (
  token_id TEXT PRIMARY KEY,
  owner_address TEXT,
  name TEXT NOT NULL,
  codename TEXT NOT NULL,
  archetype TEXT NOT NULL,
  portrait_id TEXT NOT NULL,
  public_summary TEXT NOT NULL DEFAULT '',
  encrypted_uri TEXT,
  metadata_hash TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_cards_owner_idx ON agent_cards (owner_address);
