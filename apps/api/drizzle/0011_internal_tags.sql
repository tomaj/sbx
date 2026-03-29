-- Proper internal_tags table (object_type: 'component' | 'asset')
CREATE TABLE IF NOT EXISTS "internal_tags" (
  "id" bigserial PRIMARY KEY,
  "space_id" integer NOT NULL REFERENCES "spaces"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "object_type" text NOT NULL DEFAULT 'component'
);
CREATE INDEX IF NOT EXISTS "idx_internal_tags_space_id" ON "internal_tags" ("space_id");
CREATE INDEX IF NOT EXISTS "idx_internal_tags_space_type" ON "internal_tags" ("space_id", "object_type");

-- Assets: add internal_tags_list and internal_tag_ids (same pattern as components)
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "internal_tags_list" json NOT NULL DEFAULT '[]'::json;
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "internal_tag_ids" json NOT NULL DEFAULT '[]'::json;

-- Remove old hacks
ALTER TABLE "assets" DROP COLUMN IF EXISTS "tags_list";
ALTER TABLE "spaces" DROP COLUMN IF EXISTS "component_tags_pool";
ALTER TABLE "spaces" DROP COLUMN IF EXISTS "asset_tags_pool";
