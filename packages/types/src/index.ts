// ── Webhook actions ────────────────────────────────────────────────────────────

export const WEBHOOK_ACTIONS = {
  // Stories
  STORY_PUBLISHED: 'story.published',
  STORY_UNPUBLISHED: 'story.unpublished',
  STORY_DELETED: 'story.deleted',
  STORY_MOVED: 'story.moved',
  // Datasources
  DATASOURCE_ENTRIES_UPDATED: 'datasource.entries_updated',
  // Assets
  ASSET_CREATED: 'asset.created',
  ASSET_REPLACED: 'asset.replaced',
  ASSET_DELETED: 'asset.deleted',
  ASSET_RESTORED: 'asset.restored',
  // Users
  USER_ADDED: 'user.added',
  USER_REMOVED: 'user.removed',
  USER_ROLES_UPDATED: 'user.roles_updated',
  // Workflow
  STAGE_CHANGED: 'stage.changed',
  // Pipeline
  PIPELINE_DEPLOYED: 'pipeline.deployed',
  // Release
  RELEASE_MERGED: 'release.merged',
} as const;

export type WebhookAction = (typeof WEBHOOK_ACTIONS)[keyof typeof WEBHOOK_ACTIONS];

export const ALL_WEBHOOK_ACTIONS: WebhookAction[] = Object.values(WEBHOOK_ACTIONS);

// ── Story ──────────────────────────────────────────────────────────────────────

export type StoryStatus = 'draft' | 'published' | 'unpublished';
export type StoryVersionAction = 'create' | 'save' | 'publish' | 'unpublish';

// ── Assets ─────────────────────────────────────────────────────────────────────

export type AssetStatus = 'active' | 'deleted';

// ── Auth / tokens ──────────────────────────────────────────────────────────────

export type TokenType = 'public' | 'preview' | 'management' | 'private';

// ── Approvals / workflows ──────────────────────────────────────────────────────

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type WorkflowStageChangeStatus = 'pending' | 'approved' | 'rejected';

// ── Webhooks ───────────────────────────────────────────────────────────────────

export type WebhookLogStatus = 'pending' | 'success' | 'failed';

// ── Scheduling ─────────────────────────────────────────────────────────────────

export type StorySchedulingStatus = 'scheduled' | 'done' | 'failed';

// ── Pagination ─────────────────────────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
}

// ── Users ───────────────────────────────────────────────────────────────────

export interface UserSpace {
  id: number;
  name: string;
  role: string;
}

export interface User {
  id: number;
  name: string;
  firstname: string;
  lastname: string;
  email: string;
  avatar: string | null;
  role: 'admin' | 'member';
  spaces: UserSpace[];
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Collaborator {
  id: number;
  userId: number;
  role: string;
  spaceRoleId: number | null;
  user: {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
    avatar: string | null;
    disabled: boolean;
  };
}

export interface UserSearchResult {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  avatar: string | null;
}

// ── Spaces ──────────────────────────────────────────────────────────────────

export interface SpaceMember {
  firstname: string;
  lastname: string;
  avatar: string | null;
}

export interface Space {
  id: number;
  name: string;
  updated_at: string;
  last_activity_at: string | null;
  members: SpaceMember[];
}

export interface SpaceDetail {
  id: number;
  uuid: string;
  name: string;
  domain: string;
  default_root: string | null;
}

// ── Datasources ─────────────────────────────────────────────────────────────

export interface Datasource {
  id: number;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface DatasourceDimension {
  id: number;
  name: string;
  entry_value: string;
}

export interface DatasourceWithDimensions {
  id: number;
  name: string;
  slug: string;
  dimensions: DatasourceDimension[];
}

export interface DatasourceEntry {
  id: number;
  name: string;
  value: string;
  position: number;
  datasource_id: number;
}

// ── Access tokens ───────────────────────────────────────────────────────────

export interface ApiToken {
  id: number;
  name: string | null;
  token: string;
  access: 'public' | 'private' | 'management';
  branch_id: number | null;
  min_cache: number;
  space_id: number;
}

// ── Branches / Pipelines ────────────────────────────────────────────────────

export interface Branch {
  id: number;
  name: string;
  url: string | null;
  position: number;
}

// ── Webhooks ────────────────────────────────────────────────────────────────

export interface Webhook {
  id: number;
  name: string;
  endpoint: string;
  description: string | null;
  secret: string | null;
  actions: string[];
  activated: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookLog {
  id: number;
  webhookEndpointId: number;
  webhookName: string | null;
  action: string;
  status: string;
  responseStatus: number | null;
  executedAt: string;
}

export interface WebhookLogDetail extends WebhookLog {
  requestBody: any;
  responseBody: string | null;
}

// ── Tags ────────────────────────────────────────────────────────────────────

export interface Tag {
  id: number;
  name: string;
}

export interface TagWithCount {
  name: string;
  taggings_count: number;
  [key: string]: unknown;
}

// ── Workflows ───────────────────────────────────────────────────────────────

export interface WorkflowStage {
  id: number;
  name: string;
  color: string;
  position: number;
}

export interface WorkflowStageDetail extends WorkflowStage {
  is_default: boolean;
  allow_publish: boolean;
  allow_all_stages: boolean;
  allow_all_users: boolean;
  story_editing_locked: boolean;
  auto_remove_assignee: boolean;
}

export interface Workflow {
  id: number;
  name: string;
  content_types: string[];
  is_default: boolean;
  stages: WorkflowStage[];
}

export interface WorkflowDetail {
  id: number;
  name: string;
  content_types: string[];
  is_default: boolean;
  stages: WorkflowStageDetail[];
}

// ── Tasks ───────────────────────────────────────────────────────────────────

export interface Task {
  id: number;
  name: string;
  description: string | null;
  task_type: string;
  last_execution: string | null;
  running: boolean;
  webhook_url: string | null;
  user_dialog: Record<string, any>;
  space_id: number;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

// ── Space roles ─────────────────────────────────────────────────────────────

export interface SpaceRole {
  id: number;
  role: string;
  subtitle: string | null;
  permissions: string[];
  allowed_paths: number[];
  blocked_paths: number[];
  datasource_ids: number[];
  blocked_datasource_ids: number[];
  asset_folder_ids: number[];
  blocked_asset_folder_ids: number[];
  allowed_languages: string[];
  blocked_languages: string[];
  user_count: number;
}

export interface SpaceRoleRef {
  id: number;
  role: string;
}

// ── Activities ──────────────────────────────────────────────────────────────

export interface ActivityRow {
  id: number;
  activity: {
    id: number;
    key: string;
    trackable_id: number | null;
    trackable_type: string | null;
    created_at: string;
    space_id: number;
  };
  trackable: { id: string | number; name: string; slug: string } | null;
  user: {
    id: number;
    userid: string;
    friendly_name: string;
    avatar: string | null;
  } | null;
}

// ── Field types ─────────────────────────────────────────────────────────────

export interface FieldType {
  id: number;
  name: string;
  approved_version: number | null;
}

// ── Personal access tokens ──────────────────────────────────────────────────

export interface PersonalAccessToken {
  id: number;
  name: string;
  lastFour: string;
  expiresAt: string | null;
  createdAt: string;
}

// ── Asset folders ───────────────────────────────────────────────────────────

export interface AssetFolder {
  id: number;
  name: string;
}
