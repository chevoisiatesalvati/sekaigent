-- Phase 8: Sherlock-style public case dossiers (off-chain journals)
ALTER TABLE missions ADD COLUMN IF NOT EXISTS case_file JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS solution_notes TEXT;
