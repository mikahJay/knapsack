-- ─────────────────────────────────────────────────────────────
-- 003_admin.sql
-- Adds is_admin flag to auth.users.
-- Seeds bob (the non-prod bypass user) as admin.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE auth.users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- The non-prod bypass user is admin by default.
-- In production, promote real users manually via:
--   UPDATE auth.users SET is_admin = true WHERE email = 'you@example.com';
UPDATE auth.users SET is_admin = true WHERE email = 'bob@local.dev';
