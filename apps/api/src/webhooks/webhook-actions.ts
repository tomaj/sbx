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

/** All action strings for use in UI selects / validation */
export const ALL_WEBHOOK_ACTIONS: WebhookAction[] = Object.values(WEBHOOK_ACTIONS);
