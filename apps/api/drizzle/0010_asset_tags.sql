ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "tags_list" json NOT NULL DEFAULT '[]'::json;
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "asset_tags_pool" json NOT NULL DEFAULT '[]'::json;
