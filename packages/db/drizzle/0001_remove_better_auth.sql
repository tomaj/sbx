-- Drop better-auth tables (no longer used)
DROP TABLE IF EXISTS "verification";
DROP TABLE IF EXISTS "account";
DROP TABLE IF EXISTS "session";
DROP TABLE IF EXISTS "user";

-- personal_access_tokens.user_id: text (better-auth UUID) → bigint (users.id)
-- Table is empty in all environments (feature not yet used)
ALTER TABLE "personal_access_tokens"
  DROP COLUMN "user_id";

ALTER TABLE "personal_access_tokens"
  ADD COLUMN "user_id" bigint NOT NULL
    REFERENCES "users"("id") ON DELETE CASCADE;

-- Recreate index with correct type
DROP INDEX IF EXISTS "idx_personal_access_tokens_user_id";
CREATE INDEX "idx_personal_access_tokens_user_id" ON "personal_access_tokens" ("user_id");
