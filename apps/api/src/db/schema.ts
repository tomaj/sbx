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
  unique,
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
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const users = pgTable('users', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  uuid: text('uuid').notNull().unique(),
  email: text('email').notNull().unique(),
  firstname: text('firstname').notNull().default(''),
  lastname: text('lastname').notNull().default(''),
  avatar: text('avatar'),
  passwordHash: text('password_hash'),
  disabled: boolean('disabled').notNull().default(false),
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
    permissions: json('permissions').notNull().default([]),
    allowedPath: text('allowed_path').notNull().default(''),
  },
  (t) => [unique().on(t.spaceId, t.userId)],
);

export const apiTokens = pgTable('api_tokens', {
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
});

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

export const componentGroups = pgTable('component_groups', {
  id: bigint('id', { mode: 'bigint' }).primaryKey(),
  uuid: text('uuid').notNull().unique(),
  spaceId: integer('space_id')
    .notNull()
    .references(() => spaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  parentId: bigint('parent_id', { mode: 'bigint' }),
  parentUuid: text('parent_uuid'),
});

export const components = pgTable('components', {
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
});

export const spaceRoles = pgTable('space_roles', {
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
});

export const webhookEndpoints = pgTable('webhook_endpoints', {
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
});

export const presets = pgTable('presets', {
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
});

export const activities = pgTable('activities', {
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
});

export const personalAccessTokens = pgTable('personal_access_tokens', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(), // better-auth user id
  name: text('name').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const stories = pgTable('stories', {
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
  sortByDate: timestamp('sort_by_date'),
  publishAt: timestamp('publish_at'),
  expireAt: timestamp('expire_at'),
  publishedAt: timestamp('published_at'),
  firstPublishedAt: timestamp('first_published_at'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  lastAuthorId: bigint('last_author_id', { mode: 'number' }),
});

export const assetFolders = pgTable('asset_folders', {
  id: bigint('id', { mode: 'number' }).primaryKey(),
  spaceId: integer('space_id')
    .notNull()
    .references(() => spaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  parentId: bigint('parent_id', { mode: 'number' }),
  uuid: text('uuid').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const assets = pgTable('assets', {
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
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const datasourceEntries = pgTable('datasource_entries', {
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
});

export const branches = pgTable('branches', {
  id: integer('id').primaryKey(),
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
});

export const releases = pgTable('releases', {
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
});

export const tasks = pgTable('tasks', {
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
});
