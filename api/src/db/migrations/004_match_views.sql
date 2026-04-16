-- ─────────────────────────────────────────────────────────────
-- 004_match_views.sql
-- Tracks whether a given user has seen a given match.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS matching.match_views (
    user_id   UUID        NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
    match_id  UUID        NOT NULL REFERENCES matching.matches(id) ON DELETE CASCADE,
    seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, match_id)
);

CREATE INDEX IF NOT EXISTS idx_match_views_user_seen_at
    ON matching.match_views (user_id, seen_at DESC);
