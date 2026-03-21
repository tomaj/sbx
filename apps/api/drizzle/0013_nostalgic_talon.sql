CREATE TABLE "branches" (
	"id" integer PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"name" text NOT NULL,
	"source_id" integer,
	"url" text,
	"position" integer DEFAULT 1 NOT NULL,
	"deployed_at" timestamp,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "releases" (
	"id" bigint PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"name" text NOT NULL,
	"uuid" text NOT NULL,
	"release_at" timestamp,
	"released" boolean DEFAULT false NOT NULL,
	"timezone" text,
	"branches_to_deploy" json DEFAULT '[]'::json NOT NULL,
	"owner_id" bigint,
	"users_to_notify_ids" json DEFAULT '[]'::json NOT NULL,
	"public" boolean DEFAULT true NOT NULL,
	"allowed_user_ids" json DEFAULT '[]'::json NOT NULL,
	"allowed_space_role_ids" json DEFAULT '[]'::json NOT NULL,
	"allowed_api_key_ids" json DEFAULT '[]'::json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "releases_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"task_type" text DEFAULT 'webhook' NOT NULL,
	"last_execution" timestamp,
	"running" boolean DEFAULT false NOT NULL,
	"last_response" json,
	"webhook_url" text,
	"user_dialog" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "default_root" text;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;