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
