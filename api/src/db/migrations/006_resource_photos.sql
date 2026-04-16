-- ─────────────────────────────────────────────────────────────
-- 006_resource_photos.sql
-- Stores photo evidence and per-resource highlight metadata.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS resource.resource_photos (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id   UUID NOT NULL REFERENCES resource.resources(id) ON DELETE CASCADE,
    mime_type     TEXT NOT NULL,
    image_base64  TEXT NOT NULL,
    image_width   INTEGER NOT NULL,
    image_height  INTEGER NOT NULL,
    focus_box     JSONB,
    detections    JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(resource_id)
);

CREATE INDEX IF NOT EXISTS idx_resource_photos_resource_id
    ON resource.resource_photos(resource_id);
