CREATE TABLE IF NOT EXISTS "story_schedulings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"story_id" bigint NOT NULL,
	"user_id" bigint,
	"language" text DEFAULT '' NOT NULL,
	"publish_at" timestamp NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_schedulings_space_id" ON "story_schedulings" USING btree ("space_id");
--> statement-breakpoint
ALTER TABLE "story_schedulings" ADD CONSTRAINT "story_schedulings_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
