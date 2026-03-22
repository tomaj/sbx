CREATE TABLE "webhook_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"webhook_endpoint_id" integer NOT NULL,
	"space_id" integer NOT NULL,
	"action" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"request_body" json,
	"response_body" text,
	"response_status" integer,
	"executed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "preview_urls" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "encode_url" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "mobile_width" integer DEFAULT 360 NOT NULL;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "visual_editor_disabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_webhook_endpoint_id_webhook_endpoints_id_fk" FOREIGN KEY ("webhook_endpoint_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;