-- ─────────────────────────────────────────────────────────────
-- 002_matching.sql
-- Adds the matching schema and stores results from any matching
-- strategy (scored need↔resource pairs).
-- ─────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS matching;

-- ── matching.matches ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matching.matches (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    need_id      UUID         NOT NULL REFERENCES need.needs(id)         ON DELETE CASCADE,
    resource_id  UUID         NOT NULL REFERENCES resource.resources(id) ON DELETE CASCADE,
    score        NUMERIC(4,3) NOT NULL CHECK (score >= 0 AND score <= 1),
    rationale    TEXT,
    strategy     TEXT         NOT NULL,
    matched_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (need_id, resource_id)   -- enables upsert; latest run wins
);

CREATE INDEX IF NOT EXISTS idx_matches_need_id      ON matching.matches (need_id);
CREATE INDEX IF NOT EXISTS idx_matches_resource_id  ON matching.matches (resource_id);
CREATE INDEX IF NOT EXISTS idx_matches_score        ON matching.matches (score DESC);
CREATE INDEX IF NOT EXISTS idx_matches_matched_at   ON matching.matches (matched_at DESC);
