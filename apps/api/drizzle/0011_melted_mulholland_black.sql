ALTER TABLE "space_members" DROP CONSTRAINT IF EXISTS "space_members_sb_id_unique";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_sb_id_unique";--> statement-breakpoint
ALTER TABLE "space_members" ALTER COLUMN "id" TYPE bigint;--> statement-breakpoint
ALTER TABLE "space_members" ALTER COLUMN "user_id" TYPE bigint;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" TYPE bigint;--> statement-breakpoint
ALTER SEQUENCE users_id_seq AS bigint MAXVALUE 9223372036854775807;--> statement-breakpoint
ALTER SEQUENCE space_members_id_seq AS bigint MAXVALUE 9223372036854775807;--> statement-breakpoint
ALTER TABLE "space_members" DROP COLUMN IF EXISTS "sb_id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "sb_id";