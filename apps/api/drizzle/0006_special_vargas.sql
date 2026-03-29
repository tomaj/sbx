CREATE TABLE "story_releases" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"story_id" bigint NOT NULL,
	"release_id" bigint NOT NULL,
	"content" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_favorites" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"space_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_favorites_user_id_resource_type_resource_id_unique" UNIQUE("user_id","resource_type","resource_id")
);
--> statement-breakpoint
ALTER TABLE "discussions" ADD COLUMN "field_key" text;--> statement-breakpoint
ALTER TABLE "discussions" ADD COLUMN "resolved_at" timestamp;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "release_ids" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "story_releases" ADD CONSTRAINT "story_releases_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_releases" ADD CONSTRAINT "story_releases_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_story_releases_unique" ON "story_releases" USING btree ("story_id","release_id");--> statement-breakpoint
CREATE INDEX "idx_story_releases_release_id" ON "story_releases" USING btree ("release_id");--> statement-breakpoint
CREATE INDEX "idx_story_releases_story_id" ON "story_releases" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_user_favorites_user_id" ON "user_favorites" USING btree ("user_id");