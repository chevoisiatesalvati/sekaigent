CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY,
  on_chain_id BIGINT,
  region_id TEXT NOT NULL,
  title TEXT NOT NULL,
  public_brief TEXT NOT NULL,
  duration TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  entry_fee_wei TEXT NOT NULL,
  prize_pool_wei TEXT NOT NULL DEFAULT '0',
  max_entrants INTEGER NOT NULL,
  status TEXT NOT NULL,
  criteria_commitment TEXT NOT NULL,
  rubric_id TEXT NOT NULL,
  hidden_criteria TEXT,
  salt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entrants (
  mission_id TEXT NOT NULL REFERENCES missions(id),
  agent_token_id TEXT NOT NULL,
  player_address TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (mission_id, agent_token_id)
);

CREATE TABLE IF NOT EXISTS plays (
  mission_id TEXT NOT NULL,
  agent_token_id TEXT NOT NULL,
  play_hash TEXT NOT NULL,
  storage_uri TEXT,
  submitted_at TIMESTAMPTZ NOT NULL,
  sealed_json TEXT,
  PRIMARY KEY (mission_id, agent_token_id)
);

CREATE TABLE IF NOT EXISTS evaluations (
  mission_id TEXT NOT NULL,
  agent_token_id TEXT NOT NULL,
  play_hash TEXT NOT NULL,
  total INTEGER NOT NULL,
  scores_json TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  eval_hash TEXT NOT NULL,
  model_id TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  evaluated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (mission_id, agent_token_id)
);

CREATE TABLE IF NOT EXISTS indexed_events (
  id BIGSERIAL PRIMARY KEY,
  tx_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL,
  event_name TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  block_number BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tx_hash, log_index)
);
