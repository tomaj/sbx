CREATE TABLE "story_versions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"story_id" bigint NOT NULL,
	"space_id" integer NOT NULL,
	"release_id" bigint,
	"user_id" bigint,
	"action" text NOT NULL,
	"status" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"full_slug" text NOT NULL,
	"content" json DEFAULT '{}' NOT NULL,
	"tag_list" json DEFAULT '[]' NOT NULL,
	"path" text,
	"is_startpage" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "story_versions" ADD CONSTRAINT "story_versions_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "story_versions" ADD CONSTRAINT "story_versions_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_story_versions_story_id" ON "story_versions" USING btree ("story_id","created_at");
--> statement-breakpoint
CREATE INDEX "idx_story_versions_space_id" ON "story_versions" USING btree ("space_id");
