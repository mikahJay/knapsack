-- ─────────────────────────────────────────────────────────────
-- 007_match_engagement.sql
-- Match "action" domain: a lifecycle per need↔resource match, chat, and
-- logistics checklists. Payment is out of scope.
-- Application code should set need/resource status (e.g. off-market) when
-- transitioning to reserved or later; not enforced here.
-- ─────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS engagement;

-- ── engagement.engagements ───────────────────────────────────
-- One row per pursuit of a scored match. Terminal rows may coexist with a
-- new row for the same match only after the previous engagement ended
-- (cancelled / declined / completed).

CREATE TABLE IF NOT EXISTS engagement.engagements (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id            UUID         NOT NULL
        REFERENCES matching.matches(id) ON DELETE CASCADE,
    -- exploring | reserved | in_fulfillment | completed | cancelled | declined
    status              TEXT         NOT NULL DEFAULT 'exploring',
    -- User who first opened the engagement (optional if system-created).
    initiated_by        UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
    -- Lifecycle timestamps; reserved_at = "off the market" / mutual intent.
    reserved_at         TIMESTAMPTZ,
    in_fulfillment_at   TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    cancelled_at        TIMESTAMPTZ,
    -- Free-form, optional (e.g. UI preferences); avoid payment fields here.
    metadata            JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CHECK (status IN (
        'exploring',
        'reserved',
        'in_fulfillment',
        'completed',
        'cancelled',
        'declined'
    ))
);

-- At most one in-flight engagement per match (re-open only after a terminal state).
CREATE UNIQUE INDEX IF NOT EXISTS idx_engagements_one_open_per_match
    ON engagement.engagements (match_id)
    WHERE status IN ('exploring', 'reserved', 'in_fulfillment');

CREATE INDEX IF NOT EXISTS idx_engagements_match_id
    ON engagement.engagements (match_id);

CREATE INDEX IF NOT EXISTS idx_engagements_status
    ON engagement.engagements (status);

CREATE INDEX IF NOT EXISTS idx_engagements_updated_at
    ON engagement.engagements (updated_at DESC);

CREATE OR REPLACE TRIGGER trg_engagements_updated_at
    BEFORE UPDATE ON engagement.engagements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── engagement.messages ──────────────────────────────────────
-- Chat between need owner and resource owner for this engagement.

CREATE TABLE IF NOT EXISTS engagement.messages (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    engagement_id   UUID         NOT NULL
        REFERENCES engagement.engagements(id) ON DELETE CASCADE,
    -- user: participant text; system: status/audit lines (sender NULL).
    kind            TEXT         NOT NULL DEFAULT 'user',
    sender_id       UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
    body            TEXT         NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CHECK (kind IN ('user', 'system')),
    CHECK (
        (kind = 'user' AND sender_id IS NOT NULL)
        OR (kind = 'system')
    )
);

CREATE INDEX IF NOT EXISTS idx_messages_engagement_created
    ON engagement.messages (engagement_id, created_at);

-- ── engagement.fulfillment_tasks ─────────────────────────────
-- Verification, transport, and handoff steps. Types are extensible in code;
-- new values require a follow-up migration if you add CHECK enforcement.

CREATE TABLE IF NOT EXISTS engagement.fulfillment_tasks (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    engagement_id   UUID         NOT NULL
        REFERENCES engagement.engagements(id) ON DELETE CASCADE,
    -- verify_need | verify_resource | arrange_transport | handoff | confirm_receipt | (custom)
    task_type       TEXT         NOT NULL,
    -- pending | in_progress | complete | waived | blocked
    status          TEXT         NOT NULL DEFAULT 'pending',
    -- Ordering within an engagement; lower runs first. Optional tie-break: created_at.
    sort_order      INTEGER      NOT NULL DEFAULT 0,
    title           TEXT,
    details         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    completed_by    UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CHECK (status IN (
        'pending',
        'in_progress',
        'complete',
        'waived',
        'blocked'
    ))
);

CREATE INDEX IF NOT EXISTS idx_fulfillment_tasks_engagement
    ON engagement.fulfillment_tasks (engagement_id, sort_order, created_at);

CREATE INDEX IF NOT EXISTS idx_fulfillment_tasks_status
    ON engagement.fulfillment_tasks (engagement_id, status);

CREATE OR REPLACE TRIGGER trg_fulfillment_tasks_updated_at
    BEFORE UPDATE ON engagement.fulfillment_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
