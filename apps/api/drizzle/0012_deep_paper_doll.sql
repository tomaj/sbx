CREATE TABLE "asset_folders" (
	"id" bigint PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"name" text NOT NULL,
	"parent_id" bigint,
	"uuid" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "asset_folders_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" bigint PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"filename" text NOT NULL,
	"content_type" text DEFAULT '' NOT NULL,
	"content_length" bigint DEFAULT 0 NOT NULL,
	"alt" text,
	"title" text,
	"copyright" text,
	"focus" text,
	"folder_id" bigint,
	"locked" boolean DEFAULT false NOT NULL,
	"expire_at" timestamp,
	"is_external_url" boolean DEFAULT false NOT NULL,
	"meta_data" json DEFAULT '{}'::json NOT NULL,
	"short_filename" text DEFAULT '' NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset_folders" ADD CONSTRAINT "asset_folders_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;