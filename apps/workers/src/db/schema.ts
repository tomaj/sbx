// Subset of apps/api schema — only tables used by workers.
// Keep in sync with apps/api/src/db/schema.ts manually (or extract to packages/db later).
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
  index,
  json,
} from 'drizzle-orm/pg-core';

export const tokenTypeEnum = pgEnum('token_type', ['public', 'private', 'management']);

export const spaces = pgTable('spaces', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  version: bigint('version', { mode: 'number' }).notNull().default(0),
});

export const users = pgTable('users', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  email: text('email').notNull().unique(),
  firstname: text('firstname').notNull().default(''),
  lastname: text('lastname').notNull().default(''),
});

export const spaceMembers = pgTable(
  'space_members',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    spaceId: integer('space_id').notNull(),
    userId: bigint('user_id', { mode: 'number' }).notNull(),
    role: text('role').notNull().default('editor'),
  },
  (t) => [
    unique().on(t.spaceId, t.userId),
    index('idx_space_members_space_id').on(t.spaceId),
  ],
);

export const stories = pgTable(
  'stories',
  {
    id: bigint('id', { mode: 'bigint' }).primaryKey(),
    spaceId: integer('space_id').notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    fullSlug: text('full_slug').notNull(),
    published: boolean('published').notNull().default(false),
    unpublishedChanges: boolean('unpublished_changes').notNull().default(false),
    content: json('content').notNull().default({}),
    publishAt: timestamp('publish_at'),
    expireAt: timestamp('expire_at'),
    publishedAt: timestamp('published_at'),
    firstPublishedAt: timestamp('first_published_at'),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    lastAuthorId: bigint('last_author_id', { mode: 'number' }),
  },
  (t) => [
    index('idx_stories_space_publish_at').on(t.spaceId, t.publishAt),
    index('idx_stories_space_expire_at').on(t.spaceId, t.expireAt),
  ],
);

export const webhookEndpoints = pgTable(
  'webhook_endpoints',
  {
    id: integer('id').primaryKey(),
    spaceId: integer('space_id').notNull(),
    name: text('name').notNull(),
    endpoint: text('endpoint').notNull(),
    secret: text('secret'),
    actions: json('actions').notNull().default([]),
    activated: boolean('activated').notNull().default(true),
    deletedAt: timestamp('deleted_at'),
  },
  (t) => [index('idx_webhook_endpoints_space_id').on(t.spaceId)],
);

export const webhookLogs = pgTable(
  'webhook_logs',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    webhookEndpointId: integer('webhook_endpoint_id').notNull(),
    spaceId: integer('space_id').notNull(),
    action: text('action').notNull(),
    status: text('status').notNull().default('pending'),
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

export const releases = pgTable(
  'releases',
  {
    id: bigint('id', { mode: 'number' }).primaryKey(),
    spaceId: integer('space_id').notNull(),
    name: text('name').notNull(),
    uuid: text('uuid').notNull().unique(),
    releaseAt: timestamp('release_at'),
    released: boolean('released').notNull().default(false),
    branchesToDeploy: json('branches_to_deploy').notNull().default([]),
    ownerId: bigint('owner_id', { mode: 'number' }),
    usersToNotifyIds: json('users_to_notify_ids').notNull().default([]),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('idx_releases_space_id').on(t.spaceId)],
);

export const workflows = pgTable(
  'workflows',
  {
    id: integer('id').primaryKey(),
    spaceId: integer('space_id').notNull(),
    name: text('name').notNull(),
  },
  (t) => [index('idx_workflows_space_id').on(t.spaceId)],
);

export const workflowStages = pgTable(
  'workflow_stages',
  {
    id: integer('id').primaryKey(),
    workflowId: integer('workflow_id').notNull(),
    spaceId: integer('space_id').notNull(),
    name: text('name').notNull(),
    userIds: json('user_ids').notNull().default([]),
    afterPublishId: integer('after_publish_id'),
  },
  (t) => [index('idx_workflow_stages_space_id').on(t.spaceId)],
);

export const workflowStageChanges = pgTable(
  'workflow_stage_changes',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    spaceId: integer('space_id').notNull(),
    storyId: bigint('story_id', { mode: 'number' }).notNull(),
    workflowStageId: integer('workflow_stage_id').notNull(),
    userId: bigint('user_id', { mode: 'number' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('idx_workflow_stage_changes_space_id').on(t.spaceId)],
);

export const approvals = pgTable(
  'approvals',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    spaceId: integer('space_id').notNull(),
    storyId: bigint('story_id', { mode: 'number' }).notNull(),
    approverId: bigint('approver_id', { mode: 'number' }).notNull(),
    status: text('status').notNull().default('pending'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('idx_approvals_space_id').on(t.spaceId)],
);

export const discussions = pgTable(
  'discussions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    spaceId: integer('space_id').notNull(),
    storyId: bigint('story_id', { mode: 'number' }),
    fieldKey: text('field_key'),
    resolvedAt: timestamp('resolved_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('idx_discussions_space_id').on(t.spaceId)],
);

export const comments = pgTable(
  'comments',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    discussionId: bigint('discussion_id', { mode: 'number' }).notNull(),
    spaceId: integer('space_id').notNull(),
    userId: bigint('user_id', { mode: 'number' }),
    message: text('message'),
    uuid: text('uuid').notNull().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('idx_comments_discussion_id').on(t.discussionId),
    index('idx_comments_space_id').on(t.spaceId),
  ],
);

export const tasks = pgTable(
  'tasks',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    spaceId: integer('space_id').notNull(),
    name: text('name').notNull(),
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

export const personalAccessTokens = pgTable(
  'personal_access_tokens',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('idx_personal_access_tokens_user_id').on(t.userId)],
);
