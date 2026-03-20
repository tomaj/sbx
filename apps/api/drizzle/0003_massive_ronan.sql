CREATE TABLE "component_groups" (
	"id" bigint PRIMARY KEY NOT NULL,
	"uuid" text NOT NULL,
	"space_id" integer NOT NULL,
	"name" text NOT NULL,
	"parent_id" bigint,
	"parent_uuid" text,
	CONSTRAINT "component_groups_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "components" (
	"id" bigint PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"component_group_uuid" text,
	"name" text NOT NULL,
	"display_name" text,
	"schema" json DEFAULT '{}'::json NOT NULL,
	"image" text,
	"preview_field" text,
	"preview_tmpl" text,
	"is_root" boolean DEFAULT false NOT NULL,
	"is_nestable" boolean DEFAULT true NOT NULL,
	"color" text,
	"icon" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "component_groups" ADD CONSTRAINT "component_groups_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "components" ADD CONSTRAINT "components_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;