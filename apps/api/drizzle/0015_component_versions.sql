CREATE TABLE "component_versions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"component_id" bigint NOT NULL,
	"space_id" integer NOT NULL,
	"user_id" bigint,
	"event" text DEFAULT 'update' NOT NULL,
	"schema" json DEFAULT '{}' NOT NULL,
	"name" text NOT NULL,
	"display_name" text,
	"is_draft" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "component_versions" ADD CONSTRAINT "component_versions_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "component_versions" ADD CONSTRAINT "component_versions_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_component_versions_component_id" ON "component_versions" USING btree ("component_id","created_at");
--> statement-breakpoint
CREATE INDEX "idx_component_versions_space_id" ON "component_versions" USING btree ("space_id");
