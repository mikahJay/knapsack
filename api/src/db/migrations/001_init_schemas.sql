-- ─────────────────────────────────────────────────────────────
-- 001_init_schemas.sql
-- Runs automatically when the postgres container starts fresh.
-- Creates the three business schemas and their core tables.
-- ─────────────────────────────────────────────────────────────

-- ── Schemas ──────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS need;
CREATE SCHEMA IF NOT EXISTS resource;

-- ── auth.users ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth.users (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT        NOT NULL UNIQUE,
    name        TEXT,
    provider    TEXT        NOT NULL DEFAULT 'google',  -- 'google' | 'local'
    provider_id TEXT,                                   -- NULL for local/bypass users
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── need.needs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS need.needs (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT        NOT NULL,
    description TEXT,
    status      TEXT        NOT NULL DEFAULT 'open',    -- open | fulfilled | closed
    owner_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── resource.resources ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS resource.resources (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT        NOT NULL,
    description TEXT,
    status      TEXT        NOT NULL DEFAULT 'available', -- available | allocated | retired
    owner_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── updated_at trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_needs_updated_at
    BEFORE UPDATE ON need.needs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_resources_updated_at
    BEFORE UPDATE ON resource.resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
