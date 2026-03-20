ALTER TABLE "space_members" ADD COLUMN "sb_id" bigint;--> statement-breakpoint
ALTER TABLE "space_members" ADD COLUMN "space_role_id" bigint;--> statement-breakpoint
ALTER TABLE "space_members" ADD COLUMN "permissions" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "space_members" ADD COLUMN "allowed_path" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "language_codes" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "version" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sb_id" bigint;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar" text;--> statement-breakpoint
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_sb_id_unique" UNIQUE("sb_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_sb_id_unique" UNIQUE("sb_id");