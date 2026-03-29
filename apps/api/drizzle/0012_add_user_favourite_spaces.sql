ALTER TABLE "users" ADD COLUMN "favourite_spaces" json NOT NULL DEFAULT '[]'::json;
