CREATE TYPE "public"."token_type" AS ENUM('public', 'private', 'management');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" bigint PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"trackable_id" bigint,
	"trackable_type" text,
	"owner_id" bigint,
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
CREATE TABLE "api_tokens" (
	"id" bigint PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"name" text,
	"token" text NOT NULL,
	"token_type" "token_type" NOT NULL,
	"branch_id" bigint,
	"story_ids" json DEFAULT '[]'::json NOT NULL,
	"min_cache" integer DEFAULT 0 NOT NULL,
	"release_ids" json DEFAULT '[]'::json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "asset_folders" (
	"id" bigint PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"name" text NOT NULL,
	"parent_id" bigint,
	"uuid" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "asset_folders_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" bigint PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"filename" text NOT NULL,
	"content_type" text DEFAULT '' NOT NULL,
	"content_length" bigint DEFAULT 0 NOT NULL,
	"alt" text,
	"title" text,
	"copyright" text,
	"focus" text,
	"folder_id" bigint,
	"locked" boolean DEFAULT false NOT NULL,
	"expire_at" timestamp,
	"is_external_url" boolean DEFAULT false NOT NULL,
	"meta_data" json DEFAULT '{}'::json NOT NULL,
	"short_filename" text DEFAULT '' NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "component_groups" (
	"id" bigint PRIMARY KEY NOT NULL,
	"uuid" text NOT NULL,
	"space_id" integer NOT NULL,
	"name" text NOT NULL,
	"parent_id" bigint,
	"parent_uuid" text,
	CONSTRAINT "component_groups_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "components" (
	"id" bigint PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"component_group_uuid" text,
	"name" text NOT NULL,
	"display_name" text,
	"schema" json DEFAULT '{}'::json NOT NULL,
	"image" text,
	"preview_field" text,
	"preview_tmpl" text,
	"is_root" boolean DEFAULT false NOT NULL,
	"is_nestable" boolean DEFAULT true NOT NULL,
	"color" text,
	"icon" text,
	"description" text,
	"all_presets" json DEFAULT '[]'::json NOT NULL,
	"internal_tags_list" json DEFAULT '[]'::json NOT NULL,
	"internal_tag_ids" json DEFAULT '[]'::json NOT NULL,
	"content_type_asset_preview" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "datasource_entries" (
	"id" bigint PRIMARY KEY NOT NULL,
	"datasource_id" bigint NOT NULL,
	"name" text NOT NULL,
	"value" text NOT NULL,
	"dimension_value" json DEFAULT '{}'::json NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "datasources" (
	"id" bigint PRIMARY KEY NOT NULL,
	"uuid" text NOT NULL,
	"space_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "datasources_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "datasources_space_id_slug_unique" UNIQUE("space_id","slug")
);
--> statement-breakpoint
CREATE TABLE "field_types" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"compiled_body" text DEFAULT '' NOT NULL,
	"space_ids" json DEFAULT '[]'::json NOT NULL,
	"options" json DEFAULT '[]'::json NOT NULL,
	"belongs_to_org" boolean DEFAULT false NOT NULL,
	"approved_version" bigint,
	"user_id" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "field_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "personal_access_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "personal_access_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "pipelines" (
	"id" serial PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"name" text NOT NULL,
	"preview_url" text DEFAULT '' NOT NULL,
	"source_of_sync" text DEFAULT 'preview' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "presets" (
	"id" bigint PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"component_id" bigint NOT NULL,
	"name" text NOT NULL,
	"preset" json DEFAULT '{}'::json NOT NULL,
	"image" text,
	"color" text,
	"icon" text,
	"description" text,
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
CREATE TABLE "space_members" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"user_id" bigint NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"space_role_id" bigint,
	"space_role_ids" json DEFAULT '[]'::json NOT NULL,
	"permissions" json DEFAULT '[]'::json NOT NULL,
	"allowed_path" text DEFAULT '' NOT NULL,
	CONSTRAINT "space_members_space_id_user_id_unique" UNIQUE("space_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "space_roles" (
	"id" bigint PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"role" text NOT NULL,
	"subtitle" text,
	"ext_id" text,
	"permissions" json DEFAULT '[]'::json NOT NULL,
	"allowed_paths" json DEFAULT '[]'::json NOT NULL,
	"blocked_paths" json DEFAULT '[]'::json NOT NULL,
	"field_permissions" json DEFAULT '[]'::json NOT NULL,
	"allowed_field_permissions" json DEFAULT '[]'::json NOT NULL,
	"readonly_field_permissions" json DEFAULT '[]'::json NOT NULL,
	"datasource_ids" json DEFAULT '[]'::json NOT NULL,
	"blocked_datasource_ids" json DEFAULT '[]'::json NOT NULL,
	"component_ids" json DEFAULT '[]'::json NOT NULL,
	"allowed_component_ids" json DEFAULT '[]'::json NOT NULL,
	"branch_ids" json DEFAULT '[]'::json NOT NULL,
	"blocked_branch_ids" json DEFAULT '[]'::json NOT NULL,
	"allowed_languages" json DEFAULT '[]'::json NOT NULL,
	"blocked_languages" json DEFAULT '[]'::json NOT NULL,
	"asset_folder_ids" json DEFAULT '[]'::json NOT NULL,
	"blocked_asset_folder_ids" json DEFAULT '[]'::json NOT NULL,
	"managed_component_ids" json DEFAULT '[]'::json NOT NULL,
	"blocked_manage_component_ids" json DEFAULT '[]'::json NOT NULL,
	"managed_component_group_uuids" json DEFAULT '[]'::json NOT NULL,
	"blocked_manage_component_group_uuids" json DEFAULT '[]'::json NOT NULL,
	"component_group_uuids" json DEFAULT '[]'::json NOT NULL,
	"blocked_component_group_uuids" json DEFAULT '[]'::json NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spaces" (
	"id" integer PRIMARY KEY NOT NULL,
	"uuid" text NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"default_lang" text DEFAULT 'default' NOT NULL,
	"language_codes" json DEFAULT '[]'::json NOT NULL,
	"version" bigint DEFAULT 0 NOT NULL,
	"first_token" text,
	"default_root" text,
	"preview_urls" json DEFAULT '[]'::json NOT NULL,
	"encode_url" boolean DEFAULT false NOT NULL,
	"mobile_width" integer DEFAULT 360 NOT NULL,
	"visual_editor_disabled" boolean DEFAULT false NOT NULL,
	"asset_library_settings" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "spaces_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" bigint PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"uuid" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"full_slug" text NOT NULL,
	"path" text,
	"parent_id" bigint,
	"group_id" text,
	"content_type" text,
	"is_folder" boolean DEFAULT false NOT NULL,
	"is_startpage" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"unpublished_changes" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"tag_list" json DEFAULT '[]'::json NOT NULL,
	"content" json DEFAULT '{}'::json NOT NULL,
	"sort_by_date" timestamp,
	"publish_at" timestamp,
	"expire_at" timestamp,
	"published_at" timestamp,
	"first_published_at" timestamp,
	"deleted_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"last_author_id" bigint
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"name" text NOT NULL,
	"taggings_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tags_space_id_name_unique" UNIQUE("space_id","name")
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
CREATE TABLE "users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uuid" text NOT NULL,
	"email" text NOT NULL,
	"firstname" text DEFAULT '' NOT NULL,
	"lastname" text DEFAULT '' NOT NULL,
	"avatar" text,
	"password_hash" text,
	"disabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"id" integer PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"endpoint" text NOT NULL,
	"secret" text,
	"actions" json DEFAULT '[]'::json NOT NULL,
	"activated" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "workflow_stages" (
	"id" integer PRIMARY KEY NOT NULL,
	"workflow_id" integer NOT NULL,
	"space_id" integer NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#babcb6' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"allow_publish" boolean DEFAULT false NOT NULL,
	"allow_all_stages" boolean DEFAULT true NOT NULL,
	"allow_admin_publish" boolean DEFAULT false NOT NULL,
	"allow_all_users" boolean DEFAULT true NOT NULL,
	"allow_admin_change" boolean DEFAULT false NOT NULL,
	"allow_editor_change" boolean DEFAULT false NOT NULL,
	"story_editing_locked" boolean DEFAULT false NOT NULL,
	"allow_none_for_next_stages" boolean DEFAULT false NOT NULL,
	"auto_remove_assignee" boolean DEFAULT false NOT NULL,
	"after_publish_id" integer,
	"user_ids" json DEFAULT '[]'::json NOT NULL,
	"space_role_ids" json DEFAULT '[]'::json NOT NULL,
	"workflow_stage_ids" json DEFAULT '[]'::json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" integer PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"name" text NOT NULL,
	"content_types" json DEFAULT '[]'::json NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_folders" ADD CONSTRAINT "asset_folders_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "component_groups" ADD CONSTRAINT "component_groups_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "components" ADD CONSTRAINT "components_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "datasource_entries" ADD CONSTRAINT "datasource_entries_datasource_id_datasources_id_fk" FOREIGN KEY ("datasource_id") REFERENCES "public"."datasources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "datasources" ADD CONSTRAINT "datasources_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presets" ADD CONSTRAINT "presets_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_roles" ADD CONSTRAINT "space_roles_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_webhook_endpoint_id_webhook_endpoints_id_fk" FOREIGN KEY ("webhook_endpoint_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_stages" ADD CONSTRAINT "workflow_stages_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_stages" ADD CONSTRAINT "workflow_stages_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activities_space_id" ON "activities" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "idx_api_tokens_space_id" ON "api_tokens" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "idx_asset_folders_space_id" ON "asset_folders" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "idx_asset_folders_space_parent" ON "asset_folders" USING btree ("space_id","parent_id");--> statement-breakpoint
CREATE INDEX "idx_assets_space_id" ON "assets" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "idx_assets_folder_id" ON "assets" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "idx_assets_deleted_at" ON "assets" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_branches_space_id" ON "branches" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "idx_component_groups_space_id" ON "component_groups" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "idx_components_space_id" ON "components" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "idx_components_space_group_uuid" ON "components" USING btree ("space_id","component_group_uuid");--> statement-breakpoint
CREATE INDEX "idx_datasource_entries_datasource_id" ON "datasource_entries" USING btree ("datasource_id");--> statement-breakpoint
CREATE INDEX "idx_personal_access_tokens_user_id" ON "personal_access_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_pipelines_space_id" ON "pipelines" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "idx_presets_space_id" ON "presets" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "idx_presets_component_id" ON "presets" USING btree ("component_id");--> statement-breakpoint
CREATE INDEX "idx_releases_space_id" ON "releases" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "idx_space_members_space_id" ON "space_members" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "idx_space_members_user_id" ON "space_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_space_roles_space_id" ON "space_roles" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "idx_stories_space_full_slug" ON "stories" USING btree ("space_id","full_slug");--> statement-breakpoint
CREATE INDEX "idx_stories_space_uuid" ON "stories" USING btree ("space_id","uuid");--> statement-breakpoint
CREATE INDEX "idx_stories_space_parent" ON "stories" USING btree ("space_id","parent_id");--> statement-breakpoint
CREATE INDEX "idx_stories_space_published" ON "stories" USING btree ("space_id","published");--> statement-breakpoint
CREATE INDEX "idx_stories_space_content_type" ON "stories" USING btree ("space_id","content_type");--> statement-breakpoint
CREATE INDEX "idx_stories_space_position" ON "stories" USING btree ("space_id","position");--> statement-breakpoint
CREATE INDEX "idx_stories_space_published_at" ON "stories" USING btree ("space_id","published_at");--> statement-breakpoint
CREATE INDEX "idx_stories_deleted_at" ON "stories" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_tasks_space_id" ON "tasks" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_endpoints_space_id" ON "webhook_endpoints" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_logs_endpoint_id" ON "webhook_logs" USING btree ("webhook_endpoint_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_logs_space_id" ON "webhook_logs" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_stages_space_id" ON "workflow_stages" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_stages_workflow_id" ON "workflow_stages" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "idx_workflows_space_id" ON "workflows" USING btree ("space_id");CREATE TABLE "approvals" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"story_id" bigint NOT NULL,
	"approver_id" bigint NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"discussion_id" bigint NOT NULL,
	"space_id" integer NOT NULL,
	"user_id" bigint,
	"message" text,
	"message_json" json DEFAULT '[]'::json NOT NULL,
	"uuid" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "comments_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "discussions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"story_id" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_stage_changes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"story_id" bigint NOT NULL,
	"workflow_stage_id" integer NOT NULL,
	"user_id" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "branches" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (sequence name "branches_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_discussion_id_discussions_id_fk" FOREIGN KEY ("discussion_id") REFERENCES "public"."discussions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_stage_changes" ADD CONSTRAINT "workflow_stage_changes_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_approvals_space_id" ON "approvals" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "idx_comments_discussion_id" ON "comments" USING btree ("discussion_id");--> statement-breakpoint
CREATE INDEX "idx_comments_space_id" ON "comments" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "idx_discussions_space_id" ON "discussions" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_stage_changes_space_id" ON "workflow_stage_changes" USING btree ("space_id");ALTER TABLE "datasources" ADD COLUMN "dimensions" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "default_full_slug" text;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "translated_slugs" json;ALTER TABLE "discussions" ADD COLUMN "resolved_at" timestamp;
ALTER TABLE "discussions" ADD COLUMN "field_key" text;
CREATE TABLE "story_releases" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"story_id" bigint NOT NULL,
	"release_id" bigint NOT NULL,
	"content" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_favorites" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"space_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_favorites_user_id_resource_type_resource_id_unique" UNIQUE("user_id","resource_type","resource_id")
);
--> statement-breakpoint
ALTER TABLE "discussions" ADD COLUMN "field_key" text;--> statement-breakpoint
ALTER TABLE "discussions" ADD COLUMN "resolved_at" timestamp;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "release_ids" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "story_releases" ADD CONSTRAINT "story_releases_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_releases" ADD CONSTRAINT "story_releases_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_story_releases_unique" ON "story_releases" USING btree ("story_id","release_id");--> statement-breakpoint
CREATE INDEX "idx_story_releases_release_id" ON "story_releases" USING btree ("release_id");--> statement-breakpoint
CREATE INDEX "idx_story_releases_story_id" ON "story_releases" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_user_favorites_user_id" ON "user_favorites" USING btree ("user_id");ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "component_tags_pool" json NOT NULL DEFAULT '[]'::json;
ALTER TABLE "stories" ADD COLUMN "favourite_for_user_ids" json NOT NULL DEFAULT '[]'::json;
DROP TABLE IF EXISTS "user_favorites";
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "tags_list" json NOT NULL DEFAULT '[]'::json;
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "asset_tags_pool" json NOT NULL DEFAULT '[]'::json;
-- Proper internal_tags table (object_type: 'component' | 'asset')
CREATE TABLE IF NOT EXISTS "internal_tags" (
  "id" bigserial PRIMARY KEY,
  "space_id" integer NOT NULL REFERENCES "spaces"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "object_type" text NOT NULL DEFAULT 'component'
);
CREATE INDEX IF NOT EXISTS "idx_internal_tags_space_id" ON "internal_tags" ("space_id");
CREATE INDEX IF NOT EXISTS "idx_internal_tags_space_type" ON "internal_tags" ("space_id", "object_type");

-- Assets: add internal_tags_list and internal_tag_ids (same pattern as components)
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "internal_tags_list" json NOT NULL DEFAULT '[]'::json;
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "internal_tag_ids" json NOT NULL DEFAULT '[]'::json;

-- Remove old hacks
ALTER TABLE "assets" DROP COLUMN IF EXISTS "tags_list";
ALTER TABLE "spaces" DROP COLUMN IF EXISTS "component_tags_pool";
ALTER TABLE "spaces" DROP COLUMN IF EXISTS "asset_tags_pool";
ALTER TABLE "users" ADD COLUMN "favourite_spaces" json NOT NULL DEFAULT '[]'::json;
ALTER TABLE "stories" ADD COLUMN "published_data" json;
CREATE TABLE "story_versions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"story_id" bigint NOT NULL,
	"space_id" integer NOT NULL,
	"release_id" bigint,
	"user_id" bigint,
	"action" text NOT NULL,
	"status" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"full_slug" text NOT NULL,
	"content" json DEFAULT '{}' NOT NULL,
	"tag_list" json DEFAULT '[]' NOT NULL,
	"path" text,
	"is_startpage" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "story_versions" ADD CONSTRAINT "story_versions_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "story_versions" ADD CONSTRAINT "story_versions_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_story_versions_story_id" ON "story_versions" USING btree ("story_id","created_at");
--> statement-breakpoint
CREATE INDEX "idx_story_versions_space_id" ON "story_versions" USING btree ("space_id");
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
ALTER TABLE "component_versions" ADD COLUMN "author_name" text;
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
CREATE TABLE IF NOT EXISTS "story_schedulings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"story_id" bigint NOT NULL,
	"user_id" bigint,
	"language" text DEFAULT '' NOT NULL,
	"publish_at" timestamp NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_schedulings_space_id" ON "story_schedulings" USING btree ("space_id");
--> statement-breakpoint
ALTER TABLE "story_schedulings" ADD CONSTRAINT "story_schedulings_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
-- Create sequences for tables that use manual max(id)+1 pattern
-- This prevents race conditions under concurrent inserts

-- webhook_endpoints uses integer PK
CREATE SEQUENCE IF NOT EXISTS webhook_endpoints_id_seq;
SELECT setval('webhook_endpoints_id_seq', COALESCE((SELECT MAX(id) FROM webhook_endpoints), 0));

-- api_tokens uses bigint PK
CREATE SEQUENCE IF NOT EXISTS api_tokens_id_seq;
SELECT setval('api_tokens_id_seq', COALESCE((SELECT MAX(id) FROM api_tokens), 0));
CREATE TABLE IF NOT EXISTS "statistics" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"counting" integer DEFAULT 0 NOT NULL,
	"total_bytes" bigint DEFAULT 0 NOT NULL,
	"created_at" date NOT NULL,
	CONSTRAINT "unq_statistics_space_date" UNIQUE("space_id","created_at")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_statistics_space_id" ON "statistics" USING btree ("space_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_statistics_created_at" ON "statistics" USING btree ("created_at");
--> statement-breakpoint
ALTER TABLE "statistics" ADD CONSTRAINT "statistics_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "spaces" ADD COLUMN "ai_settings" json NOT NULL DEFAULT '{}'::json;
CREATE TABLE IF NOT EXISTS "api_request_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"user_id" bigint,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"status_code" integer,
	"response_time_ms" integer,
	"token_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_request_logs_space_id" ON "api_request_logs" USING btree ("space_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_request_logs_created_at" ON "api_request_logs" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_request_logs_user_id" ON "api_request_logs" USING btree ("user_id");
--> statement-breakpoint
ALTER TABLE "api_request_logs" ADD CONSTRAINT "api_request_logs_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
CREATE TABLE IF NOT EXISTS "ai_logs" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "space_id" integer NOT NULL,
  "operation" text NOT NULL,
  "provider_name" text NOT NULL,
  "model_identifier" text NOT NULL,
  "input_tokens" integer,
  "output_tokens" integer,
  "total_tokens" integer,
  "status" text NOT NULL DEFAULT 'success',
  "error_message" text,
  "duration_ms" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_ai_logs_space_created" ON "ai_logs" ("space_id","created_at");
