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
