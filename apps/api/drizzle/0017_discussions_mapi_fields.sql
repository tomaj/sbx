ALTER TABLE "discussions" ADD COLUMN "title" text;
ALTER TABLE "discussions" ADD COLUMN "block_uid" text;
ALTER TABLE "discussions" ADD COLUMN "fieldname" text;
ALTER TABLE "discussions" ADD COLUMN "component" text;
ALTER TABLE "discussions" ADD COLUMN "lang" text;
ALTER TABLE "discussions" ADD COLUMN "uuid" text;
ALTER TABLE "discussions" ADD COLUMN "solved_at" timestamp;

-- Backfill uuid for existing rows
UPDATE "discussions" SET "uuid" = gen_random_uuid()::text WHERE "uuid" IS NULL;

-- Now make uuid NOT NULL and unique
ALTER TABLE "discussions" ALTER COLUMN "uuid" SET NOT NULL;
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_uuid_unique" UNIQUE ("uuid");

-- Sync solved_at with existing resolved_at values
UPDATE "discussions" SET "solved_at" = "resolved_at" WHERE "resolved_at" IS NOT NULL;

-- Backfill fieldname from field_key for existing rows
UPDATE "discussions" SET "fieldname" = "field_key" WHERE "field_key" IS NOT NULL AND "fieldname" IS NULL;
