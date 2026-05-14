-- ─────────────────────────────────────────────────────────────
-- 008_match_mutual_interest_and_messages.sql
-- Adds mutual_interest pair status and match-scoped messages.
-- Dev-first: drop/recreate pair_status check to extend enum.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE matching.matches
  DROP CONSTRAINT IF EXISTS matches_pair_status_check;

ALTER TABLE matching.matches
  ADD CONSTRAINT matches_pair_status_check
  CHECK (
    pair_status IN (
      'open',
      'in_conversation',
      'mutual_interest',
      'closed_rejected',
      'closed_flagged'
    )
  );

CREATE TABLE IF NOT EXISTS matching.match_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id   UUID        NOT NULL REFERENCES matching.matches(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body       TEXT        NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 8000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_messages_match_created
  ON matching.match_messages (match_id, created_at ASC);
