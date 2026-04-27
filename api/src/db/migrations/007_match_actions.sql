-- ─────────────────────────────────────────────────────────────
-- 007_match_actions.sql
-- Persists per-user actions on a match and pair-level status.
-- Dev-first migration: no backfill required.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE matching.matches
  ADD COLUMN IF NOT EXISTS pair_status TEXT NOT NULL DEFAULT 'open'
    CHECK (pair_status IN ('open', 'in_conversation', 'closed_rejected', 'closed_flagged')),
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_matches_pair_status
  ON matching.matches (pair_status);

CREATE TABLE IF NOT EXISTS matching.match_actions (
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id   UUID        NOT NULL REFERENCES matching.matches(id) ON DELETE CASCADE,
  action     TEXT        NOT NULL
    CHECK (action IN ('rejected', 'clarify', 'soft_yes', 'snoozed', 'flagged')),
  details    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, match_id)
);

CREATE INDEX IF NOT EXISTS idx_match_actions_match_updated
  ON matching.match_actions (match_id, updated_at DESC);

