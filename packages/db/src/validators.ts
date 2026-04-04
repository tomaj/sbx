/**
 * Zod validators auto-generated from Drizzle schema via drizzle-zod.
 *
 * Each table gets two schemas:
 *   - `insert*Schema`  — validated shape for INSERT (omits auto-generated fields like id, createdAt)
 *   - `select*Schema`  — full row shape returned by SELECT
 *
 * Import from @sbx/db:
 *   import { insertStorySchema, selectUserSchema } from '@sbx/db'
 */

import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import {
  activities,
  aiLogs,
  apiRequestLogs,
  apiTokens,
  approvals,
  assetFolders,
  assets,
  branches,
  comments,
  componentGroups,
  componentVersions,
  components,
  datasourceEntries,
  datasources,
  discussions,
  fieldTypes,
  internalTags,
  personalAccessTokens,
  pipelines,
  presets,
  releases,
  spaceMembers,
  spaceRoles,
  spaces,
  statistics,
  stories,
  storyReleases,
  storySchedulings,
  storyVersions,
  tags,
  tasks,
  users,
  webhookEndpoints,
  webhookLogs,
  workflowStageChanges,
  workflowStages,
  workflows,
} from './schema';

// ── spaces ──────────────────────────────────────────────────────────────────
export const insertSpaceSchema = createInsertSchema(spaces);
export const selectSpaceSchema = createSelectSchema(spaces);
export type InsertSpace = typeof insertSpaceSchema.type;
export type SelectSpace = typeof selectSpaceSchema.type;

// ── users ────────────────────────────────────────────────────────────────────
export const insertUserSchema = createInsertSchema(users).omit({
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
});
export const selectUserSchema = createSelectSchema(users).omit({ passwordHash: true });
export type InsertUser = typeof insertUserSchema.type;
export type SelectUser = typeof selectUserSchema.type;

// ── spaceMembers ─────────────────────────────────────────────────────────────
export const insertSpaceMemberSchema = createInsertSchema(spaceMembers).omit({ id: true });
export const selectSpaceMemberSchema = createSelectSchema(spaceMembers);
export type InsertSpaceMember = typeof insertSpaceMemberSchema.type;
export type SelectSpaceMember = typeof selectSpaceMemberSchema.type;

// ── apiTokens ────────────────────────────────────────────────────────────────
export const insertApiTokenSchema = createInsertSchema(apiTokens).omit({ createdAt: true });
export const selectApiTokenSchema = createSelectSchema(apiTokens);
export type InsertApiToken = typeof insertApiTokenSchema.type;
export type SelectApiToken = typeof selectApiTokenSchema.type;

// ── personalAccessTokens ─────────────────────────────────────────────────────
export const insertPersonalAccessTokenSchema = createInsertSchema(personalAccessTokens).omit({
  id: true,
  createdAt: true,
});
export const selectPersonalAccessTokenSchema = createSelectSchema(personalAccessTokens);
export type InsertPersonalAccessToken = typeof insertPersonalAccessTokenSchema.type;
export type SelectPersonalAccessToken = typeof selectPersonalAccessTokenSchema.type;

// ── internalTags ─────────────────────────────────────────────────────────────
export const insertInternalTagSchema = createInsertSchema(internalTags).omit({ id: true });
export const selectInternalTagSchema = createSelectSchema(internalTags);
export type InsertInternalTag = typeof insertInternalTagSchema.type;
export type SelectInternalTag = typeof selectInternalTagSchema.type;

// ── stories ──────────────────────────────────────────────────────────────────
export const insertStorySchema = createInsertSchema(stories).omit({
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
  firstPublishedAt: true,
  deletedAt: true,
});
export const selectStorySchema = createSelectSchema(stories);
export type InsertStory = typeof insertStorySchema.type;
export type SelectStory = typeof selectStorySchema.type;

// ── storyVersions ─────────────────────────────────────────────────────────────
export const insertStoryVersionSchema = createInsertSchema(storyVersions).omit({
  id: true,
  createdAt: true,
});
export const selectStoryVersionSchema = createSelectSchema(storyVersions);
export type InsertStoryVersion = typeof insertStoryVersionSchema.type;
export type SelectStoryVersion = typeof selectStoryVersionSchema.type;

// ── storyReleases ─────────────────────────────────────────────────────────────
export const insertStoryReleaseSchema = createInsertSchema(storyReleases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectStoryReleaseSchema = createSelectSchema(storyReleases);
export type InsertStoryRelease = typeof insertStoryReleaseSchema.type;
export type SelectStoryRelease = typeof selectStoryReleaseSchema.type;

// ── storySchedulings ─────────────────────────────────────────────────────────
export const insertStorySchedulingSchema = createInsertSchema(storySchedulings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export const selectStorySchedulingSchema = createSelectSchema(storySchedulings);
export type InsertStoryScheduling = typeof insertStorySchedulingSchema.type;
export type SelectStoryScheduling = typeof selectStorySchedulingSchema.type;

// ── assets ───────────────────────────────────────────────────────────────────
export const insertAssetSchema = createInsertSchema(assets).omit({
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export const selectAssetSchema = createSelectSchema(assets);
export type InsertAsset = typeof insertAssetSchema.type;
export type SelectAsset = typeof selectAssetSchema.type;

// ── assetFolders ─────────────────────────────────────────────────────────────
export const insertAssetFolderSchema = createInsertSchema(assetFolders).omit({
  createdAt: true,
  updatedAt: true,
});
export const selectAssetFolderSchema = createSelectSchema(assetFolders);
export type InsertAssetFolder = typeof insertAssetFolderSchema.type;
export type SelectAssetFolder = typeof selectAssetFolderSchema.type;

// ── components ───────────────────────────────────────────────────────────────
export const insertComponentSchema = createInsertSchema(components).omit({
  createdAt: true,
  updatedAt: true,
});
export const selectComponentSchema = createSelectSchema(components);
export type InsertComponent = typeof insertComponentSchema.type;
export type SelectComponent = typeof selectComponentSchema.type;

// ── componentGroups ──────────────────────────────────────────────────────────
export const insertComponentGroupSchema = createInsertSchema(componentGroups);
export const selectComponentGroupSchema = createSelectSchema(componentGroups);
export type InsertComponentGroup = typeof insertComponentGroupSchema.type;
export type SelectComponentGroup = typeof selectComponentGroupSchema.type;

// ── componentVersions ─────────────────────────────────────────────────────────
export const insertComponentVersionSchema = createInsertSchema(componentVersions).omit({
  id: true,
  createdAt: true,
});
export const selectComponentVersionSchema = createSelectSchema(componentVersions);
export type InsertComponentVersion = typeof insertComponentVersionSchema.type;
export type SelectComponentVersion = typeof selectComponentVersionSchema.type;

// ── datasources ──────────────────────────────────────────────────────────────
export const insertDatasourceSchema = createInsertSchema(datasources).omit({
  createdAt: true,
  updatedAt: true,
});
export const selectDatasourceSchema = createSelectSchema(datasources);
export type InsertDatasource = typeof insertDatasourceSchema.type;
export type SelectDatasource = typeof selectDatasourceSchema.type;

// ── datasourceEntries ────────────────────────────────────────────────────────
export const insertDatasourceEntrySchema = createInsertSchema(datasourceEntries).omit({
  createdAt: true,
  updatedAt: true,
});
export const selectDatasourceEntrySchema = createSelectSchema(datasourceEntries);
export type InsertDatasourceEntry = typeof insertDatasourceEntrySchema.type;
export type SelectDatasourceEntry = typeof selectDatasourceEntrySchema.type;

// ── tags ─────────────────────────────────────────────────────────────────────
export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true,
});
export const selectTagSchema = createSelectSchema(tags);
export type InsertTag = typeof insertTagSchema.type;
export type SelectTag = typeof selectTagSchema.type;

// ── spaceRoles ───────────────────────────────────────────────────────────────
export const insertSpaceRoleSchema = createInsertSchema(spaceRoles);
export const selectSpaceRoleSchema = createSelectSchema(spaceRoles);
export type InsertSpaceRole = typeof insertSpaceRoleSchema.type;
export type SelectSpaceRole = typeof selectSpaceRoleSchema.type;

// ── branches ─────────────────────────────────────────────────────────────────
export const insertBranchSchema = createInsertSchema(branches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  deployedAt: true,
});
export const selectBranchSchema = createSelectSchema(branches);
export type InsertBranch = typeof insertBranchSchema.type;
export type SelectBranch = typeof selectBranchSchema.type;

// ── releases ─────────────────────────────────────────────────────────────────
export const insertReleaseSchema = createInsertSchema(releases).omit({
  createdAt: true,
  updatedAt: true,
});
export const selectReleaseSchema = createSelectSchema(releases);
export type InsertRelease = typeof insertReleaseSchema.type;
export type SelectRelease = typeof selectReleaseSchema.type;

// ── workflows ────────────────────────────────────────────────────────────────
export const insertWorkflowSchema = createInsertSchema(workflows).omit({
  createdAt: true,
  updatedAt: true,
});
export const selectWorkflowSchema = createSelectSchema(workflows);
export type InsertWorkflow = typeof insertWorkflowSchema.type;
export type SelectWorkflow = typeof selectWorkflowSchema.type;

// ── workflowStages ───────────────────────────────────────────────────────────
export const insertWorkflowStageSchema = createInsertSchema(workflowStages).omit({
  createdAt: true,
  updatedAt: true,
});
export const selectWorkflowStageSchema = createSelectSchema(workflowStages);
export type InsertWorkflowStage = typeof insertWorkflowStageSchema.type;
export type SelectWorkflowStage = typeof selectWorkflowStageSchema.type;

// ── workflowStageChanges ─────────────────────────────────────────────────────
export const insertWorkflowStageChangeSchema = createInsertSchema(workflowStageChanges).omit({
  id: true,
  createdAt: true,
});
export const selectWorkflowStageChangeSchema = createSelectSchema(workflowStageChanges);
export type InsertWorkflowStageChange = typeof insertWorkflowStageChangeSchema.type;
export type SelectWorkflowStageChange = typeof selectWorkflowStageChangeSchema.type;

// ── approvals ────────────────────────────────────────────────────────────────
export const insertApprovalSchema = createInsertSchema(approvals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectApprovalSchema = createSelectSchema(approvals);
export type InsertApproval = typeof insertApprovalSchema.type;
export type SelectApproval = typeof selectApprovalSchema.type;

// ── discussions ──────────────────────────────────────────────────────────────
export const insertDiscussionSchema = createInsertSchema(discussions).omit({
  id: true,
  uuid: true,
  createdAt: true,
  updatedAt: true,
  solvedAt: true,
  resolvedAt: true,
});
export const selectDiscussionSchema = createSelectSchema(discussions);
export type InsertDiscussion = typeof insertDiscussionSchema.type;
export type SelectDiscussion = typeof selectDiscussionSchema.type;

// ── comments ─────────────────────────────────────────────────────────────────
export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectCommentSchema = createSelectSchema(comments);
export type InsertComment = typeof insertCommentSchema.type;
export type SelectComment = typeof selectCommentSchema.type;

// ── webhookEndpoints ─────────────────────────────────────────────────────────
export const insertWebhookEndpointSchema = createInsertSchema(webhookEndpoints).omit({
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export const selectWebhookEndpointSchema = createSelectSchema(webhookEndpoints);
export type InsertWebhookEndpoint = typeof insertWebhookEndpointSchema.type;
export type SelectWebhookEndpoint = typeof selectWebhookEndpointSchema.type;

// ── webhookLogs ──────────────────────────────────────────────────────────────
export const insertWebhookLogSchema = createInsertSchema(webhookLogs).omit({
  id: true,
  executedAt: true,
});
export const selectWebhookLogSchema = createSelectSchema(webhookLogs);
export type InsertWebhookLog = typeof insertWebhookLogSchema.type;
export type SelectWebhookLog = typeof selectWebhookLogSchema.type;

// ── presets ──────────────────────────────────────────────────────────────────
export const insertPresetSchema = createInsertSchema(presets).omit({
  createdAt: true,
  updatedAt: true,
});
export const selectPresetSchema = createSelectSchema(presets);
export type InsertPreset = typeof insertPresetSchema.type;
export type SelectPreset = typeof selectPresetSchema.type;

// ── activities ───────────────────────────────────────────────────────────────
export const insertActivitySchema = createInsertSchema(activities);
export const selectActivitySchema = createSelectSchema(activities);
export type InsertActivity = typeof insertActivitySchema.type;
export type SelectActivity = typeof selectActivitySchema.type;

// ── tasks ────────────────────────────────────────────────────────────────────
export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastExecution: true,
});
export const selectTaskSchema = createSelectSchema(tasks);
export type InsertTask = typeof insertTaskSchema.type;
export type SelectTask = typeof selectTaskSchema.type;

// ── pipelines ────────────────────────────────────────────────────────────────
export const insertPipelineSchema = createInsertSchema(pipelines).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectPipelineSchema = createSelectSchema(pipelines);
export type InsertPipeline = typeof insertPipelineSchema.type;
export type SelectPipeline = typeof selectPipelineSchema.type;

// ── fieldTypes ───────────────────────────────────────────────────────────────
export const insertFieldTypeSchema = createInsertSchema(fieldTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectFieldTypeSchema = createSelectSchema(fieldTypes);
export type InsertFieldType = typeof insertFieldTypeSchema.type;
export type SelectFieldType = typeof selectFieldTypeSchema.type;

// ── statistics ───────────────────────────────────────────────────────────────
export const insertStatisticsSchema = createInsertSchema(statistics).omit({ id: true });
export const selectStatisticsSchema = createSelectSchema(statistics);
export type InsertStatistics = typeof insertStatisticsSchema.type;
export type SelectStatistics = typeof selectStatisticsSchema.type;

// ── apiRequestLogs ───────────────────────────────────────────────────────────
export const insertApiRequestLogSchema = createInsertSchema(apiRequestLogs).omit({
  id: true,
  createdAt: true,
});
export const selectApiRequestLogSchema = createSelectSchema(apiRequestLogs);
export type InsertApiRequestLog = typeof insertApiRequestLogSchema.type;
export type SelectApiRequestLog = typeof selectApiRequestLogSchema.type;

// ── aiLogs ───────────────────────────────────────────────────────────────────
export const insertAiLogSchema = createInsertSchema(aiLogs).omit({
  id: true,
  createdAt: true,
});
export const selectAiLogSchema = createSelectSchema(aiLogs);
export type InsertAiLog = typeof insertAiLogSchema.type;
export type SelectAiLog = typeof selectAiLogSchema.type;
