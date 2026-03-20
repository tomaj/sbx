CREATE TABLE "presets" (
	"id" bigint PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"component_id" bigint NOT NULL,
	"name" text NOT NULL,
	"preset" json DEFAULT '{}'::json NOT NULL,
	"image" text,
	"color" text,
	"icon" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "presets" ADD CONSTRAINT "presets_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;