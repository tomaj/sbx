import {
  pgTable,
  pgEnum,
  serial,
  bigserial,
  integer,
  bigint,
  text,
  boolean,
  timestamp,
  date,
  unique,
  index,
  uniqueIndex,
  json,
} from 'drizzle-orm/pg-core';

export const tokenTypeEnum = pgEnum('token_type', [
  'public',
  'private',
  'management',
]);

export const spaces = pgTable('spaces', {
  id: integer('id').primaryKey(),
  uuid: text('uuid').notNull().unique(),
  name: text('name').notNull(),
  domain: text('domain'),
  defaultLang: text('default_lang').notNull().default('default'),
  languageCodes: json('language_codes').notNull().default([]),
  // version = unix timestamp, updated on every publish (used for CDN cache invalidation)
  version: bigint('version', { mode: 'number' }).notNull().default(0),
  firstToken: text('first_token'),
  defaultRoot: text('default_root'),
  // Visual Editor settings
  previewUrls: json('preview_urls').notNull().default([]),
  encodeUrl: boolean('encode_url').notNull().default(false),
  mobileWidth: integer('mobile_width').notNull().default(360),
  visualEditorDisabled: boolean('visual_editor_disabled').notNull().default(false),
  // Asset Library settings
  assetLibrarySettings: json('asset_library_settings').notNull().default({}),
  // AI settings (provider config + branding context)
  aiSettings: json('ai_settings').notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const internalTags = pgTable(
  'internal_tags',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    spaceId: integer('space_id').notNull().references(() => spaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    // object_type: 'component' | 'asset'
    objectType: text('object_type').notNull().default('component'),
  },
  (t) => [
    index('idx_internal_tags_space_id').on(t.spaceId),
    index('idx_internal_tags_space_type').on(t.spaceId, t.objectType),
  ],
);

export const users = pgTable('users', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  uuid: text('uuid').notNull().unique(),
  email: text('email').notNull().unique(),
  firstname: text('firstname').notNull().default(''),
  lastname: text('lastname').notNull().default(''),
  avatar: text('avatar'),
  passwordHash: text('password_hash'),
  disabled: boolean('disabled').notNull().default(false),
  favouriteSpaces: json('favourite_spaces').notNull().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const spaceMembers = pgTable(
  'space_members',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    spaceId: integer('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('editor'),
    spaceRoleId: bigint('space_role_id', { mode: 'bigint' }),
    spaceRoleIds: json('space_role_ids').notNull().default([]),
    permissions: json('permissions').notNull().default([]),
    allowedPath: text('allowed_path').notNull().default(''),
  },
  (t) => [
    unique().on(t.spaceId, t.userId),
    index('idx_space_members_space_id').on(t.spaceId),
    index('idx_space_members_user_id').on(t.userId),
  ],
);

export const apiTokens = pgTable(
  'api_tokens',
  {
    id: bigint('id', { mode: 'number' }).primaryKey(),
    spaceId: integer('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    name: text('name'),
    token: text('token').notNull().unique(),
    tokenType: tokenTypeEnum('token_type').notNull(),
    branchId: bigint('branch_id', { mode: 'number' }),
    storyIds: json('story_ids').notNull().default([]),
    minCache: integer('min_cache').notNull().default(0),
    releaseIds: json('release_ids').notNull().default([]),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('idx_api_tokens_space_id').on(t.spaceId)],
);

export const datasources = pgTable(
  'datasources',
  {
    id: bigint('id', { mode: 'bigint' }).primaryKey(),
    uuid: text('uuid').notNull().unique(),
    spaceId: integer('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    dimensions: json('dimensions').notNull().default([]),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [unique().on(t.spaceId, t.slug)],
);

export const tags = pgTable(
  'tags',
  {
    id: serial('id').primaryKey(),
    spaceId: integer('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    taggingsCount: integer('taggings_count').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [unique().on(t.spaceId, t.name)],
);

export const componentGroups = pgTable(
  'component_groups',
  {
    id: bigint('id', { mode: 'bigint' }).primaryKey(),
    uuid: text('uuid').notNull().unique(),
    spaceId: integer('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    parentId: bigint('parent_id', { mode: 'bigint' }),
    parentUuid: text('parent_uuid'),
  },
  (t) => [index('idx_component_groups_space_id').on(t.spaceId)],
);

export const components = pgTable(
  'components',
  {
    id: bigint('id', { mode: 'bigint' }).primaryKey(),
    spaceId: integer('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    componentGroupUuid: text('component_group_uuid'),
    name: text('name').notNull(),
    displayName: text('display_name'),
    schema: json('schema').notNull().default({}),
    image: text('image'),
    previewField: text('preview_field'),
    previewTmpl: text('preview_tmpl'),
    isRoot: boolean('is_root').notNull().default(false),
    isNestable: boolean('is_nestable').notNull().default(true),
    color: text('color'),
    icon: text('icon'),
    description: text('description'),
    // all_presets: array of preset objects [{id, name, component_id, image, icon, color, description}]
    allPresets: json('all_presets').notNull().default([]),
    // internal_tags_list: [{id, name}]
    internalTagsList: json('internal_tags_list').notNull().default([]),
    // internal_tag_ids: ["id1", "id2"]
    internalTagIds: json('internal_tag_ids').notNull().default([]),
    // content_type_asset_preview: field key used as asset preview for content type blocks
    contentTypeAssetPreview: text('content_type_asset_preview'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('idx_components_space_id').on(t.spaceId),
    index('idx_components_space_group_uuid').on(t.spaceId, t.componentGroupUuid),
  ],
);

export const spaceRoles = pgTable(
  'space_roles',
  {
    id: bigint('id', { mode: 'bigint' }).primaryKey(),
    spaceId: integer('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    subtitle: text('subtitle'),
    extId: text('ext_id'),
    permissions: json('permissions').notNull().default([]),
    allowedPaths: json('allowed_paths').notNull().default([]),
    blockedPaths: json('blocked_paths').notNull().default([]),
    fieldPermissions: json('field_permissions').notNull().default([]),
    allowedFieldPermissions: json('allowed_field_permissions').notNull().default([]),
    readonlyFieldPermissions: json('readonly_field_permissions').notNull().default([]),
    datasourceIds: json('datasource_ids').notNull().default([]),
    blockedDatasourceIds: json('blocked_datasource_ids').notNull().default([]),
    componentIds: json('component_ids').notNull().default([]),
    allowedComponentIds: json('allowed_component_ids').notNull().default([]),
    branchIds: json('branch_ids').notNull().default([]),
    blockedBranchIds: json('blocked_branch_ids').notNull().default([]),
    allowedLanguages: json('allowed_languages').notNull().default([]),
    blockedLanguages: json('blocked_languages').notNull().default([]),
    assetFolderIds: json('asset_folder_ids').notNull().default([]),
    blockedAssetFolderIds: json('blocked_asset_folder_ids').notNull().default([]),
    managedComponentIds: json('managed_component_ids').notNull().default([]),
    blockedManageComponentIds: json('blocked_manage_component_ids').notNull().default([]),
    managedComponentGroupUuids: json('managed_component_group_uuids').notNull().default([]),
    blockedManageComponentGroupUuids: json('blocked_manage_component_group_uuids').notNull().default([]),
    componentGroupUuids: json('component_group_uuids').notNull().default([]),
    blockedComponentGroupUuids: json('blocked_component_group_uuids').notNull().default([]),
  },
  (t) => [index('idx_space_roles_space_id').on(t.spaceId)],
);

export const webhookEndpoints = pgTable(
  'webhook_endpoints',
  {
    id: integer('id').primaryKey(),
    spaceId: integer('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    endpoint: text('endpoint').notNull(),
    secret: text('secret'),
    actions: json('actions').notNull().default([]),
    activated: boolean('activated').notNull().default(true),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('idx_webhook_endpoints_space_id').on(t.spaceId)],
);

export const webhookLogs = pgTable(
  'webhook_logs',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    webhookEndpointId: integer('webhook_endpoint_id')
      .notNull()
      .references(() => webhookEndpoints.id, { onDelete: 'cascade' }),
    spaceId: integer('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    status: text('status').notNull().default('pending'), // 'success' | 'failed'
    requestBody: json('request_body'),
    responseBody: text('response_body'),
    responseStatus: integer('response_status'),
    executedAt: timestamp('executed_at').notNull().defaultNow(),
  },
  (t) => [
    index('idx_webhook_logs_endpoint_id').on(t.webhookEndpointId),
    index('idx_webhook_logs_space_id').on(t.spaceId),
  ],
);

export const workflows = pgTable(
  'workflows',
  {
    id: integer('id').primaryKey(),
    spaceId: integer('space_id').notNull().references(() => spaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    contentTypes: json('content_types').notNull().default([]),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('idx_workflows_space_id').on(t.spaceId)],
);

export const workflowStages = pgTable(
  'workflow_stages',
  {
    id: integer('id').primaryKey(),
    workflowId: integer('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
    spaceId: integer('space_id').notNull().references(() => spaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull().default('#babcb6'),
    position: integer('position').notNull().default(0),
    isDefault: boolean('is_default').notNull().default(false),
    allowPublish: boolean('allow_publish').notNull().default(false),
    allowAllStages: boolean('allow_all_stages').notNull().default(true),
    allowAdminPublish: boolean('allow_admin_publish').notNull().default(false),
    allowAllUsers: boolean('allow_all_users').notNull().default(true),
    allowAdminChange: boolean('allow_admin_change').notNull().default(false),
    allowEditorChange: boolean('allow_editor_change').notNull().default(false),
    storyEditingLocked: boolean('story_editing_locked').notNull().default(false),
    allowNoneForNextStages: boolean('allow_none_for_next_stages').notNull().default(false),
    autoRemoveAssignee: boolean('auto_remove_assignee').notNull().default(false),
    afterPublishId: integer('after_publish_id'),
    userIds: json('user_ids').notNull().default([]),
    spaceRoleIds: json('space_role_ids').notNull().default([]),
    workflowStageIds: json('workflow_stage_ids').notNull().default([]),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('idx_workflow_stages_space_id').on(t.spaceId),
    index('idx_workflow_stages_workflow_id').on(t.workflowId),
  ],
);

export const presets = pgTable(
  'presets',
  {
    id: bigint('id', { mode: 'bigint' }).primaryKey(),
    spaceId: integer('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    componentId: bigint('component_id', { mode: 'bigint' }).notNull(),
    name: text('name').notNull(),
    preset: json('preset').notNull().default({}),
    image: text('image'),
    color: text('color'),
    icon: text('icon'),
    description: text('description'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('idx_presets_space_id').on(t.spaceId),
    index('idx_presets_component_id').on(t.componentId),
  ],
);

export const activities = pgTable(
  'activities',
  {
    id: bigint('id', { mode: 'bigint' }).primaryKey(),
    spaceId: integer('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    trackableId: bigint('trackable_id', { mode: 'bigint' }),
    trackableType: text('trackable_type'),
    ownerId: bigint('owner_id', { mode: 'bigint' }),
    ownerType: text('owner_type'),
    key: text('key').notNull(),
    parameters: json('parameters').notNull().default({}),
    recipientId: bigint('recipient_id', { mode: 'bigint' }),
    recipientType: text('recipient_type'),
    // denormalized trackable/user info for display (mirrors Storyblok response)
    trackable: json('trackable').notNull().default({}),
    user: json('user').notNull().default({}),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (t) => [index('idx_activities_space_id').on(t.spaceId)],
);

export const personalAccessTokens = pgTable(
  'personal_access_tokens',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(), // better-auth user id
    name: text('name').notNull(),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('idx_personal_access_tokens_user_id').on(t.userId)],
);

export const stories = pgTable(
  'stories',
  {
    id: bigint('id', { mode: 'bigint' }).primaryKey(),
    spaceId: integer('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    uuid: text('uuid').notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    fullSlug: text('full_slug').notNull(),
    path: text('path'),
    parentId: bigint('parent_id', { mode: 'bigint' }),
    groupId: text('group_id'),
    contentType: text('content_type'),
    isFolder: boolean('is_folder').notNull().default(false),
    isStartpage: boolean('is_startpage').notNull().default(false),
    published: boolean('published').notNull().default(false),
    unpublishedChanges: boolean('unpublished_changes').notNull().default(false),
    position: integer('position').notNull().default(0),
    tagList: json('tag_list').notNull().default([]),
    content: json('content').notNull().default({}),
    defaultFullSlug: text('default_full_slug'),
    translatedSlugs: json('translated_slugs'),
    sortByDate: timestamp('sort_by_date'),
    publishAt: timestamp('publish_at'),
    expireAt: timestamp('expire_at'),
    publishedAt: timestamp('published_at'),
    firstPublishedAt: timestamp('first_published_at'),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    lastAuthorId: bigint('last_author_id', { mode: 'number' }),
    releaseIds: json('release_ids').notNull().default([]),
    publishedData: json('published_data'),
    favouriteForUserIds: json('favourite_for_user_ids').notNull().default([]),
    disableFEEditor: boolean('disable_fe_editor').notNull().default(false),
  },
  (t) => [
    // Primary lookup: CDN slug lookup (most critical)
    index('idx_stories_space_full_slug').on(t.spaceId, t.fullSlug),
    // UUID lookup
    index('idx_stories_space_uuid').on(t.spaceId, t.uuid),
    // Parent browsing (folder navigation)
    index('idx_stories_space_parent').on(t.spaceId, t.parentId),
    // Filter by published status
    index('idx_stories_space_published').on(t.spaceId, t.published),
    // Filter by content type
    index('idx_stories_space_content_type').on(t.spaceId, t.contentType),
    // Sorting by position
    index('idx_stories_space_position').on(t.spaceId, t.position),
    // Sorting by published_at
    index('idx_stories_space_published_at').on(t.spaceId, t.publishedAt),
    // Soft delete filter
    index('idx_stories_deleted_at').on(t.deletedAt),
  ],
);

export const assetFolders = pgTable(
  'asset_folders',
  {
    id: bigint('id', { mode: 'number' }).primaryKey(),
    spaceId: integer('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    parentId: bigint('parent_id', { mode: 'number' }),
    uuid: text('uuid').notNull().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('idx_asset_folders_space_id').on(t.spaceId),
    index('idx_asset_folders_space_parent').on(t.spaceId, t.parentId),
  ],
);

export const assets = pgTable(
  'assets',
  {
    id: bigint('id', { mode: 'number' }).primaryKey(),
    spaceId: integer('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    contentType: text('content_type').notNull().default(''),
    contentLength: bigint('content_length', { mode: 'number' }).notNull().default(0),
    alt: text('alt'),
    title: text('title'),
    copyright: text('copyright'),
    focus: text('focus'),
    folderId: bigint('folder_id', { mode: 'number' }),
    locked: boolean('locked').notNull().default(false),
    expireAt: timestamp('expire_at'),
    isExternalUrl: boolean('is_external_url').notNull().default(false),
    metaData: json('meta_data').notNull().default({}),
    shortFilename: text('short_filename').notNull().default(''),
    // internal_tags_list: [{id: number, name: string}]
    internalTagsList: json('internal_tags_list').notNull().default([]),
    // internal_tag_ids: ["id1", "id2"]
    internalTagIds: json('internal_tag_ids').notNull().default([]),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('idx_assets_space_id').on(t.spaceId),
    index('idx_assets_folder_id').on(t.folderId),
    index('idx_assets_deleted_at').on(t.deletedAt),
  ],
);

export const datasourceEntries = pgTable(
  'datasource_entries',
  {
    id: bigint('id', { mode: 'bigint' }).primaryKey(),
    datasourceId: bigint('datasource_id', { mode: 'bigint' })
      .notNull()
      .references(() => datasources.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    value: text('value').notNull(),
    dimensionValue: json('dimension_value').notNull().default({}),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('idx_datasource_entries_datasource_id').on(t.datasourceId)],
);

export const branches = pgTable(
  'branches',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    spaceId: integer('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sourceId: integer('source_id'),
    url: text('url'),
    position: integer('position').notNull().default(1),
    deployedAt: timestamp('deployed_at'),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('idx_branches_space_id').on(t.spaceId)],
);

export const releases = pgTable(
  'releases',
  {
    id: bigint('id', { mode: 'number' }).primaryKey(),
    spaceId: integer('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    uuid: text('uuid').notNull().unique(),
    releaseAt: timestamp('release_at'),
    released: boolean('released').notNull().default(false),
    timezone: text('timezone'),
    branchesToDeploy: json('branches_to_deploy').notNull().default([]),
    ownerId: bigint('owner_id', { mode: 'number' }),
    usersToNotifyIds: json('users_to_notify_ids').notNull().default([]),
    public: boolean('public').notNull().default(true),
    allowedUserIds: json('allowed_user_ids').notNull().default([]),
    allowedSpaceRoleIds: json('allowed_space_role_ids').notNull().default([]),
    allowedApiKeyIds: json('allowed_api_key_ids').notNull().default([]),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('idx_releases_space_id').on(t.spaceId)],
);

export const storyReleases = pgTable(
  'story_releases',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    storyId: bigint('story_id', { mode: 'number' })
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    releaseId: bigint('release_id', { mode: 'number' })
      .notNull()
      .references(() => releases.id, { onDelete: 'cascade' }),
    content: json('content').notNull().default({}),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('idx_story_releases_unique').on(t.storyId, t.releaseId),
    index('idx_story_releases_release_id').on(t.releaseId),
    index('idx_story_releases_story_id').on(t.storyId),
  ],
);

export const storyVersions = pgTable(
  'story_versions',
  {
    id: bigint('id', { mode: 'number' }).primaryKey(),
    storyId: bigint('story_id', { mode: 'number' }).notNull().references(() => stories.id, { onDelete: 'cascade' }),
    spaceId: integer('space_id').notNull().references(() => spaces.id, { onDelete: 'cascade' }),
    releaseId: bigint('release_id', { mode: 'number' }),
    userId: bigint('user_id', { mode: 'number' }),
    action: text('action').notNull(), // 'create' | 'save' | 'publish' | 'unpublish'
    status: text('status').notNull(), // 'draft' | 'published' | 'unpublished'
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    fullSlug: text('full_slug').notNull(),
    content: json('content').notNull().default({}),
    tagList: json('tag_list').notNull().default([]),
    path: text('path'),
    isStartpage: boolean('is_startpage').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('idx_story_versions_story_id').on(t.storyId, t.createdAt),
    index('idx_story_versions_space_id').on(t.spaceId),
  ],
);

export const componentVersions = pgTable(
  'component_versions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    componentId: bigint('component_id', { mode: 'number' }).notNull().references(() => components.id, { onDelete: 'cascade' }),
    spaceId: integer('space_id').notNull().references(() => spaces.id, { onDelete: 'cascade' }),
    userId: bigint('user_id', { mode: 'number' }),
    authorName: text('author_name'),
    event: text('event').notNull().default('update'),
    schema: json('schema').notNull().default({}),
    name: text('name').notNull(),
    displayName: text('display_name'),
    isDraft: boolean('is_draft').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('idx_component_versions_component_id').on(t.componentId, t.createdAt),
    index('idx_component_versions_space_id').on(t.spaceId),
  ],
);

export const tasks = pgTable(
  'tasks',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    spaceId: integer('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    taskType: text('task_type').notNull().default('webhook'),
    lastExecution: timestamp('last_execution'),
    running: boolean('running').notNull().default(false),
    lastResponse: json('last_response'),
    webhookUrl: text('webhook_url'),
    userDialog: json('user_dialog').notNull().default({}),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('idx_tasks_space_id').on(t.spaceId)],
);

export const pipelines = pgTable(
  'pipelines',
  {
    id: serial('id').primaryKey(),
    spaceId: integer('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    previewUrl: text('preview_url').notNull().default(''),
    sourceOfSync: text('source_of_sync').notNull().default('preview'),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('idx_pipelines_space_id').on(t.spaceId)],
);

export const fieldTypes = pgTable('field_types', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: text('name').notNull().unique(),
  body: text('body').notNull().default(''),
  compiledBody: text('compiled_body').notNull().default(''),
  spaceIds: json('space_ids').notNull().default([]),
  options: json('options').notNull().default([]),
  belongsToOrg: boolean('belongs_to_org').notNull().default(false),
  approvedVersion: bigint('approved_version', { mode: 'number' }),
  userId: bigint('user_id', { mode: 'number' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const workflowStageChanges = pgTable(
  'workflow_stage_changes',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    spaceId: integer('space_id').notNull().references(() => spaces.id, { onDelete: 'cascade' }),
    storyId: bigint('story_id', { mode: 'number' }).notNull(),
    workflowStageId: integer('workflow_stage_id').notNull(),
    workflowId: integer('workflow_id'),
    userId: bigint('user_id', { mode: 'number' }),
    dueDate: timestamp('due_date'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('idx_workflow_stage_changes_space_id').on(t.spaceId)],
);

export const discussions = pgTable(
  'discussions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    spaceId: integer('space_id').notNull().references(() => spaces.id, { onDelete: 'cascade' }),
    storyId: bigint('story_id', { mode: 'number' }),
    fieldKey: text('field_key'),
    title: text('title'),
    blockUid: text('block_uid'),
    fieldname: text('fieldname'),
    component: text('component'),
    lang: text('lang'),
    uuid: text('uuid').notNull().unique().$defaultFn(() => crypto.randomUUID()),
    solvedAt: timestamp('solved_at'),
    resolvedAt: timestamp('resolved_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('idx_discussions_space_id').on(t.spaceId)],
);

export const comments = pgTable(
  'comments',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    discussionId: bigint('discussion_id', { mode: 'number' }).notNull().references(() => discussions.id, { onDelete: 'cascade' }),
    spaceId: integer('space_id').notNull().references(() => spaces.id, { onDelete: 'cascade' }),
    userId: bigint('user_id', { mode: 'number' }),
    message: text('message'),
    messageJson: json('message_json').notNull().default([]),
    uuid: text('uuid').notNull().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('idx_comments_discussion_id').on(t.discussionId),
    index('idx_comments_space_id').on(t.spaceId),
  ],
);


export const approvals = pgTable(
  'approvals',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    spaceId: integer('space_id').notNull().references(() => spaces.id, { onDelete: 'cascade' }),
    storyId: bigint('story_id', { mode: 'number' }).notNull(),
    approverId: bigint('approver_id', { mode: 'number' }).notNull(),
    status: text('status').notNull().default('pending'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('idx_approvals_space_id').on(t.spaceId)],
);

export const storySchedulings = pgTable(
  'story_schedulings',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    spaceId: integer('space_id').notNull().references(() => spaces.id, { onDelete: 'cascade' }),
    storyId: bigint('story_id', { mode: 'number' }).notNull(),
    userId: bigint('user_id', { mode: 'number' }),
    language: text('language').notNull().default(''),
    publishAt: timestamp('publish_at').notNull(),
    status: text('status').notNull().default('scheduled'),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('idx_story_schedulings_space_id').on(t.spaceId)],
);

export const statistics = pgTable(
  'statistics',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    spaceId: integer('space_id').notNull().references(() => spaces.id, { onDelete: 'cascade' }),
    counting: integer('counting').notNull().default(0),
    totalBytes: bigint('total_bytes', { mode: 'number' }).notNull().default(0),
    createdAt: date('created_at').notNull(),
  },
  (t) => [
    index('idx_statistics_space_id').on(t.spaceId),
    index('idx_statistics_created_at').on(t.createdAt),
    unique('unq_statistics_space_date').on(t.spaceId, t.createdAt),
  ],
);

export const apiRequestLogs = pgTable(
  'api_request_logs',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    spaceId: integer('space_id').notNull().references(() => spaces.id, { onDelete: 'cascade' }),
    userId: bigint('user_id', { mode: 'number' }),
    method: text('method').notNull(),
    path: text('path').notNull(),
    statusCode: integer('status_code'),
    responseTimeMs: integer('response_time_ms'),
    tokenType: text('token_type'),   // 'session' | 'management' | 'public' | 'preview'
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('idx_api_request_logs_space_id').on(t.spaceId),
    index('idx_api_request_logs_created_at').on(t.createdAt),
    index('idx_api_request_logs_user_id').on(t.userId),
  ],
);

export const aiLogs = pgTable(
  'ai_logs',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    spaceId: integer('space_id').notNull(),
    operation: text('operation').notNull(),
    providerName: text('provider_name').notNull(),
    modelIdentifier: text('model_identifier').notNull(),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    totalTokens: integer('total_tokens'),
    status: text('status').notNull().default('success'),
    errorMessage: text('error_message'),
    durationMs: integer('duration_ms'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('idx_ai_logs_space_created').on(t.spaceId, t.createdAt),
  ],
);
