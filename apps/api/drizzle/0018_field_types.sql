CREATE TABLE IF NOT EXISTS "field_types" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "body" text NOT NULL DEFAULT '',
  "compiled_body" text NOT NULL DEFAULT '',
  "space_ids" json NOT NULL DEFAULT '[]',
  "options" json NOT NULL DEFAULT '[]',
  "belongs_to_org" boolean NOT NULL DEFAULT false,
  "approved_version" bigint,
  "user_id" bigint,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "field_types_name_unique" UNIQUE("name")
);
