import {
  pgTable,
  pgEnum,
  serial,
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
  'preview',
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
  id: serial('id').primaryKey(),
  // sbId = original Storyblok user ID (BigInt), null for locally created users
  sbId: bigint('sb_id', { mode: 'bigint' }).unique(),
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
    id: serial('id').primaryKey(),
    // sbId = original Storyblok collaborator ID
    sbId: bigint('sb_id', { mode: 'bigint' }).unique(),
    spaceId: integer('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
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
  id: serial('id').primaryKey(),
  spaceId: integer('space_id')
    .notNull()
    .references(() => spaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  token: text('token').notNull().unique(),
  tokenType: tokenTypeEnum('token_type').notNull(),
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

export const datasourceEntries = pgTable('datasource_entries', {
  id: bigint('id', { mode: 'bigint' }).primaryKey(),
  datasourceId: bigint('datasource_id', { mode: 'bigint' })
    .notNull()
    .references(() => datasources.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  value: text('value').notNull(),
  dimensionValue: json('dimension_value').notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
