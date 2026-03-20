CREATE TABLE "space_roles" (
	"id" bigint PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"role" text NOT NULL,
	"subtitle" text,
	"ext_id" text,
	"permissions" json DEFAULT '[]'::json NOT NULL,
	"allowed_paths" json DEFAULT '[]'::json NOT NULL,
	"blocked_paths" json DEFAULT '[]'::json NOT NULL,
	"field_permissions" json DEFAULT '[]'::json NOT NULL,
	"allowed_field_permissions" json DEFAULT '[]'::json NOT NULL,
	"readonly_field_permissions" json DEFAULT '[]'::json NOT NULL,
	"datasource_ids" json DEFAULT '[]'::json NOT NULL,
	"blocked_datasource_ids" json DEFAULT '[]'::json NOT NULL,
	"component_ids" json DEFAULT '[]'::json NOT NULL,
	"allowed_component_ids" json DEFAULT '[]'::json NOT NULL,
	"branch_ids" json DEFAULT '[]'::json NOT NULL,
	"blocked_branch_ids" json DEFAULT '[]'::json NOT NULL,
	"allowed_languages" json DEFAULT '[]'::json NOT NULL,
	"blocked_languages" json DEFAULT '[]'::json NOT NULL,
	"asset_folder_ids" json DEFAULT '[]'::json NOT NULL,
	"blocked_asset_folder_ids" json DEFAULT '[]'::json NOT NULL,
	"managed_component_ids" json DEFAULT '[]'::json NOT NULL,
	"blocked_manage_component_ids" json DEFAULT '[]'::json NOT NULL,
	"managed_component_group_uuids" json DEFAULT '[]'::json NOT NULL,
	"blocked_manage_component_group_uuids" json DEFAULT '[]'::json NOT NULL,
	"component_group_uuids" json DEFAULT '[]'::json NOT NULL,
	"blocked_component_group_uuids" json DEFAULT '[]'::json NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"id" integer PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"endpoint" text NOT NULL,
	"secret" text,
	"actions" json DEFAULT '[]'::json NOT NULL,
	"activated" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_tokens" ALTER COLUMN "token_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."token_type";--> statement-breakpoint
CREATE TYPE "public"."token_type" AS ENUM('public', 'private', 'management');--> statement-breakpoint
ALTER TABLE "api_tokens" ALTER COLUMN "token_type" SET DATA TYPE "public"."token_type" USING "token_type"::"public"."token_type";--> statement-breakpoint
ALTER TABLE "api_tokens" ALTER COLUMN "id" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "api_tokens" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "api_tokens" ADD COLUMN "branch_id" bigint;--> statement-breakpoint
ALTER TABLE "api_tokens" ADD COLUMN "story_ids" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "api_tokens" ADD COLUMN "min_cache" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "api_tokens" ADD COLUMN "release_ids" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "space_roles" ADD CONSTRAINT "space_roles_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;