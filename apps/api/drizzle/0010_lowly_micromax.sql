ALTER TABLE "stories" ALTER COLUMN "last_author_id" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "datasource_entries" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;