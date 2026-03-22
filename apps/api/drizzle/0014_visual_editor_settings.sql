ALTER TABLE "spaces" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "preview_urls" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "encode_url" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "mobile_width" integer DEFAULT 360 NOT NULL;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "visual_editor_disabled" boolean DEFAULT false NOT NULL;
