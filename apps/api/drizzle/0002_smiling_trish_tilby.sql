ALTER TABLE "datasources" ADD COLUMN "dimensions" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "default_full_slug" text;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "translated_slugs" json;