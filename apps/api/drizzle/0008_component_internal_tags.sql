ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "component_tags_pool" json NOT NULL DEFAULT '[]'::json;
