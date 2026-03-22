ALTER TABLE "space_members" ADD COLUMN "space_role_ids" json NOT NULL DEFAULT '[]'::json;
