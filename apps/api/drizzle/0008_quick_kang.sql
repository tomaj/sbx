CREATE TABLE "activities" (
	"id" bigint PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"trackable_id" bigint,
	"trackable_type" text,
	"owner_id" integer,
	"owner_type" text,
	"key" text NOT NULL,
	"parameters" json DEFAULT '{}'::json NOT NULL,
	"recipient_id" bigint,
	"recipient_type" text,
	"trackable" json DEFAULT '{}'::json NOT NULL,
	"user" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;