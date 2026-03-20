ALTER TYPE "token_type" RENAME VALUE 'preview' TO 'private';--> statement-breakpoint
ALTER TABLE "api_tokens" ALTER COLUMN "id" TYPE bigint USING id::bigint;--> statement-breakpoint
ALTER TABLE "api_tokens" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
DROP SEQUENCE IF EXISTS "api_tokens_id_seq";--> statement-breakpoint
ALTER TABLE "api_tokens" ADD COLUMN "branch_id" bigint;--> statement-breakpoint
ALTER TABLE "api_tokens" ADD COLUMN "story_ids" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "api_tokens" ADD COLUMN "min_cache" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "api_tokens" ADD COLUMN "release_ids" json DEFAULT '[]'::json NOT NULL;
