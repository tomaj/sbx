ALTER TABLE "components" ADD COLUMN "all_presets" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "components" ADD COLUMN "internal_tags_list" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "components" ADD COLUMN "internal_tag_ids" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "components" ADD COLUMN "content_type_asset_preview" text;