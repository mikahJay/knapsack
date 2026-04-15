-- ─────────────────────────────────────────────────────────────
-- 005_versioned_needs_resources.sql
-- Adds immutable version chain support for needs/resources.
-- A row is current when replaced_by_id IS NULL.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE need.needs
    ADD COLUMN IF NOT EXISTS replaced_by_id UUID REFERENCES need.needs(id) ON DELETE SET NULL;

ALTER TABLE resource.resources
    ADD COLUMN IF NOT EXISTS replaced_by_id UUID REFERENCES resource.resources(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_need_needs_replaced_by_id
    ON need.needs (replaced_by_id);

CREATE INDEX IF NOT EXISTS idx_resource_resources_replaced_by_id
    ON resource.resources (replaced_by_id);
