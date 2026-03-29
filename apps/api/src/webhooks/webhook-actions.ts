export const WEBHOOK_ACTIONS = {
  // Stories
  STORY_PUBLISHED: 'story.published',
  STORY_UNPUBLISHED: 'story.unpublished',
  STORY_CREATED: 'story.created',
  STORY_UPDATED: 'story.updated',
  STORY_DELETED: 'story.deleted',
  STORY_MOVED: 'story.moved',
  // Assets
  ASSET_CREATED: 'asset.created',
  ASSET_UPDATED: 'asset.updated',
  ASSET_DELETED: 'asset.deleted',
  // Datasource entries
  DATASOURCE_ENTRY_CREATED: 'datasource_entry.created',
  DATASOURCE_ENTRY_UPDATED: 'datasource_entry.updated',
  DATASOURCE_ENTRY_DELETED: 'datasource_entry.deleted',
  // Collaborators
  USER_ADDED_TO_SPACE: 'user.added_to_space',
  USER_REMOVED_FROM_SPACE: 'user.removed_from_space',
} as const;

export type WebhookAction = (typeof WEBHOOK_ACTIONS)[keyof typeof WEBHOOK_ACTIONS];

/** All action strings for use in UI selects / validation */
export const ALL_WEBHOOK_ACTIONS: WebhookAction[] = Object.values(WEBHOOK_ACTIONS);
