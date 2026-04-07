-- ─────────────────────────────────────────────────────────────
-- 002_add_public_quantity_dates.sql
-- Adds visibility flag, quantity, and date fields to needs and
-- resources. All columns have defaults so existing rows are safe.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE need.needs
    ADD COLUMN IF NOT EXISTS is_public  BOOLEAN     NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS quantity   INTEGER     NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS needed_by  TIMESTAMPTZ;

ALTER TABLE resource.resources
    ADD COLUMN IF NOT EXISTS is_public       BOOLEAN     NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS quantity        INTEGER     NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS available_until TIMESTAMPTZ;
