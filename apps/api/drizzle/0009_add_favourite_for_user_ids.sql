ALTER TABLE "stories" ADD COLUMN "favourite_for_user_ids" json NOT NULL DEFAULT '[]'::json;
DROP TABLE IF EXISTS "user_favorites";
