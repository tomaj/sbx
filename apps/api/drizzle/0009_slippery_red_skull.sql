CREATE TABLE "personal_access_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "personal_access_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" bigint PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"uuid" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"full_slug" text NOT NULL,
	"path" text,
	"parent_id" bigint,
	"group_id" text,
	"content_type" text,
	"is_folder" boolean DEFAULT false NOT NULL,
	"is_startpage" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"unpublished_changes" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"tag_list" json DEFAULT '[]'::json NOT NULL,
	"content" json DEFAULT '{}'::json NOT NULL,
	"sort_by_date" timestamp,
	"publish_at" timestamp,
	"expire_at" timestamp,
	"published_at" timestamp,
	"first_published_at" timestamp,
	"deleted_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"last_author_id" integer
);
--> statement-breakpoint
ALTER TABLE "activities" ALTER COLUMN "owner_id" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;