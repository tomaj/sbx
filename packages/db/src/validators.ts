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
export type InsertSpace = typeof insertSpaceSchema._type;
export type SelectSpace = typeof selectSpaceSchema._type;

// ── users ────────────────────────────────────────────────────────────────────
export const insertUserSchema = createInsertSchema(users).omit({
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
});
export const selectUserSchema = createSelectSchema(users).omit({ passwordHash: true });
export type InsertUser = typeof insertUserSchema._type;
export type SelectUser = typeof selectUserSchema._type;

// ── spaceMembers ─────────────────────────────────────────────────────────────
export const insertSpaceMemberSchema = createInsertSchema(spaceMembers).omit({ id: true });
export const selectSpaceMemberSchema = createSelectSchema(spaceMembers);
export type InsertSpaceMember = typeof insertSpaceMemberSchema._type;
export type SelectSpaceMember = typeof selectSpaceMemberSchema._type;

// ── apiTokens ────────────────────────────────────────────────────────────────
export const insertApiTokenSchema = createInsertSchema(apiTokens).omit({ createdAt: true });
export const selectApiTokenSchema = createSelectSchema(apiTokens);
export type InsertApiToken = typeof insertApiTokenSchema._type;
export type SelectApiToken = typeof selectApiTokenSchema._type;

// ── personalAccessTokens ─────────────────────────────────────────────────────
export const insertPersonalAccessTokenSchema = createInsertSchema(personalAccessTokens).omit({
  id: true,
  createdAt: true,
});
export const selectPersonalAccessTokenSchema = createSelectSchema(personalAccessTokens);
export type InsertPersonalAccessToken = typeof insertPersonalAccessTokenSchema._type;
export type SelectPersonalAccessToken = typeof selectPersonalAccessTokenSchema._type;

// ── internalTags ─────────────────────────────────────────────────────────────
export const insertInternalTagSchema = createInsertSchema(internalTags).omit({ id: true });
export const selectInternalTagSchema = createSelectSchema(internalTags);
export type InsertInternalTag = typeof insertInternalTagSchema._type;
export type SelectInternalTag = typeof selectInternalTagSchema._type;

// ── stories ──────────────────────────────────────────────────────────────────
export const insertStorySchema = createInsertSchema(stories).omit({
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
  firstPublishedAt: true,
  deletedAt: true,
});
export const selectStorySchema = createSelectSchema(stories);
export type InsertStory = typeof insertStorySchema._type;
export type SelectStory = typeof selectStorySchema._type;

// ── storyVersions ─────────────────────────────────────────────────────────────
export const insertStoryVersionSchema = createInsertSchema(storyVersions).omit({
  id: true,
  createdAt: true,
});
export const selectStoryVersionSchema = createSelectSchema(storyVersions);
export type InsertStoryVersion = typeof insertStoryVersionSchema._type;
export type SelectStoryVersion = typeof selectStoryVersionSchema._type;

// ── storyReleases ─────────────────────────────────────────────────────────────
export const insertStoryReleaseSchema = createInsertSchema(storyReleases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectStoryReleaseSchema = createSelectSchema(storyReleases);
export type InsertStoryRelease = typeof insertStoryReleaseSchema._type;
export type SelectStoryRelease = typeof selectStoryReleaseSchema._type;

// ── storySchedulings ─────────────────────────────────────────────────────────
export const insertStorySchedulingSchema = createInsertSchema(storySchedulings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export const selectStorySchedulingSchema = createSelectSchema(storySchedulings);
export type InsertStoryScheduling = typeof insertStorySchedulingSchema._type;
export type SelectStoryScheduling = typeof selectStorySchedulingSchema._type;

// ── assets ───────────────────────────────────────────────────────────────────
export const insertAssetSchema = createInsertSchema(assets).omit({
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export const selectAssetSchema = createSelectSchema(assets);
export type InsertAsset = typeof insertAssetSchema._type;
export type SelectAsset = typeof selectAssetSchema._type;

// ── assetFolders ─────────────────────────────────────────────────────────────
export const insertAssetFolderSchema = createInsertSchema(assetFolders).omit({
  createdAt: true,
  updatedAt: true,
});
export const selectAssetFolderSchema = createSelectSchema(assetFolders);
export type InsertAssetFolder = typeof insertAssetFolderSchema._type;
export type SelectAssetFolder = typeof selectAssetFolderSchema._type;

// ── components ───────────────────────────────────────────────────────────────
export const insertComponentSchema = createInsertSchema(components).omit({
  createdAt: true,
  updatedAt: true,
});
export const selectComponentSchema = createSelectSchema(components);
export type InsertComponent = typeof insertComponentSchema._type;
export type SelectComponent = typeof selectComponentSchema._type;

// ── componentGroups ──────────────────────────────────────────────────────────
export const insertComponentGroupSchema = createInsertSchema(componentGroups);
export const selectComponentGroupSchema = createSelectSchema(componentGroups);
export type InsertComponentGroup = typeof insertComponentGroupSchema._type;
export type SelectComponentGroup = typeof selectComponentGroupSchema._type;

// ── componentVersions ─────────────────────────────────────────────────────────
export const insertComponentVersionSchema = createInsertSchema(componentVersions).omit({
  id: true,
  createdAt: true,
});
export const selectComponentVersionSchema = createSelectSchema(componentVersions);
export type InsertComponentVersion = typeof insertComponentVersionSchema._type;
export type SelectComponentVersion = typeof selectComponentVersionSchema._type;

// ── datasources ──────────────────────────────────────────────────────────────
export const insertDatasourceSchema = createInsertSchema(datasources).omit({
  createdAt: true,
  updatedAt: true,
});
export const selectDatasourceSchema = createSelectSchema(datasources);
export type InsertDatasource = typeof insertDatasourceSchema._type;
export type SelectDatasource = typeof selectDatasourceSchema._type;

// ── datasourceEntries ────────────────────────────────────────────────────────
export const insertDatasourceEntrySchema = createInsertSchema(datasourceEntries).omit({
  createdAt: true,
  updatedAt: true,
});
export const selectDatasourceEntrySchema = createSelectSchema(datasourceEntries);
export type InsertDatasourceEntry = typeof insertDatasourceEntrySchema._type;
export type SelectDatasourceEntry = typeof selectDatasourceEntrySchema._type;

// ── tags ─────────────────────────────────────────────────────────────────────
export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true,
});
export const selectTagSchema = createSelectSchema(tags);
export type InsertTag = typeof insertTagSchema._type;
export type SelectTag = typeof selectTagSchema._type;

// ── spaceRoles ───────────────────────────────────────────────────────────────
export const insertSpaceRoleSchema = createInsertSchema(spaceRoles);
export const selectSpaceRoleSchema = createSelectSchema(spaceRoles);
export type InsertSpaceRole = typeof insertSpaceRoleSchema._type;
export type SelectSpaceRole = typeof selectSpaceRoleSchema._type;

// ── branches ─────────────────────────────────────────────────────────────────
export const insertBranchSchema = createInsertSchema(branches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  deployedAt: true,
});
export const selectBranchSchema = createSelectSchema(branches);
export type InsertBranch = typeof insertBranchSchema._type;
export type SelectBranch = typeof selectBranchSchema._type;

// ── releases ─────────────────────────────────────────────────────────────────
export const insertReleaseSchema = createInsertSchema(releases).omit({
  createdAt: true,
  updatedAt: true,
});
export const selectReleaseSchema = createSelectSchema(releases);
export type InsertRelease = typeof insertReleaseSchema._type;
export type SelectRelease = typeof selectReleaseSchema._type;

// ── workflows ────────────────────────────────────────────────────────────────
export const insertWorkflowSchema = createInsertSchema(workflows).omit({
  createdAt: true,
  updatedAt: true,
});
export const selectWorkflowSchema = createSelectSchema(workflows);
export type InsertWorkflow = typeof insertWorkflowSchema._type;
export type SelectWorkflow = typeof selectWorkflowSchema._type;

// ── workflowStages ───────────────────────────────────────────────────────────
export const insertWorkflowStageSchema = createInsertSchema(workflowStages).omit({
  createdAt: true,
  updatedAt: true,
});
export const selectWorkflowStageSchema = createSelectSchema(workflowStages);
export type InsertWorkflowStage = typeof insertWorkflowStageSchema._type;
export type SelectWorkflowStage = typeof selectWorkflowStageSchema._type;

// ── workflowStageChanges ─────────────────────────────────────────────────────
export const insertWorkflowStageChangeSchema = createInsertSchema(workflowStageChanges).omit({
  id: true,
  createdAt: true,
});
export const selectWorkflowStageChangeSchema = createSelectSchema(workflowStageChanges);
export type InsertWorkflowStageChange = typeof insertWorkflowStageChangeSchema._type;
export type SelectWorkflowStageChange = typeof selectWorkflowStageChangeSchema._type;

// ── approvals ────────────────────────────────────────────────────────────────
export const insertApprovalSchema = createInsertSchema(approvals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectApprovalSchema = createSelectSchema(approvals);
export type InsertApproval = typeof insertApprovalSchema._type;
export type SelectApproval = typeof selectApprovalSchema._type;

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
export type InsertDiscussion = typeof insertDiscussionSchema._type;
export type SelectDiscussion = typeof selectDiscussionSchema._type;

// ── comments ─────────────────────────────────────────────────────────────────
export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectCommentSchema = createSelectSchema(comments);
export type InsertComment = typeof insertCommentSchema._type;
export type SelectComment = typeof selectCommentSchema._type;

// ── webhookEndpoints ─────────────────────────────────────────────────────────
export const insertWebhookEndpointSchema = createInsertSchema(webhookEndpoints).omit({
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export const selectWebhookEndpointSchema = createSelectSchema(webhookEndpoints);
export type InsertWebhookEndpoint = typeof insertWebhookEndpointSchema._type;
export type SelectWebhookEndpoint = typeof selectWebhookEndpointSchema._type;

// ── webhookLogs ──────────────────────────────────────────────────────────────
export const insertWebhookLogSchema = createInsertSchema(webhookLogs).omit({
  id: true,
  executedAt: true,
});
export const selectWebhookLogSchema = createSelectSchema(webhookLogs);
export type InsertWebhookLog = typeof insertWebhookLogSchema._type;
export type SelectWebhookLog = typeof selectWebhookLogSchema._type;

// ── presets ──────────────────────────────────────────────────────────────────
export const insertPresetSchema = createInsertSchema(presets).omit({
  createdAt: true,
  updatedAt: true,
});
export const selectPresetSchema = createSelectSchema(presets);
export type InsertPreset = typeof insertPresetSchema._type;
export type SelectPreset = typeof selectPresetSchema._type;

// ── activities ───────────────────────────────────────────────────────────────
export const insertActivitySchema = createInsertSchema(activities);
export const selectActivitySchema = createSelectSchema(activities);
export type InsertActivity = typeof insertActivitySchema._type;
export type SelectActivity = typeof selectActivitySchema._type;

// ── tasks ────────────────────────────────────────────────────────────────────
export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastExecution: true,
});
export const selectTaskSchema = createSelectSchema(tasks);
export type InsertTask = typeof insertTaskSchema._type;
export type SelectTask = typeof selectTaskSchema._type;

// ── pipelines ────────────────────────────────────────────────────────────────
export const insertPipelineSchema = createInsertSchema(pipelines).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectPipelineSchema = createSelectSchema(pipelines);
export type InsertPipeline = typeof insertPipelineSchema._type;
export type SelectPipeline = typeof selectPipelineSchema._type;

// ── fieldTypes ───────────────────────────────────────────────────────────────
export const insertFieldTypeSchema = createInsertSchema(fieldTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectFieldTypeSchema = createSelectSchema(fieldTypes);
export type InsertFieldType = typeof insertFieldTypeSchema._type;
export type SelectFieldType = typeof selectFieldTypeSchema._type;

// ── statistics ───────────────────────────────────────────────────────────────
export const insertStatisticsSchema = createInsertSchema(statistics).omit({ id: true });
export const selectStatisticsSchema = createSelectSchema(statistics);
export type InsertStatistics = typeof insertStatisticsSchema._type;
export type SelectStatistics = typeof selectStatisticsSchema._type;

// ── apiRequestLogs ───────────────────────────────────────────────────────────
export const insertApiRequestLogSchema = createInsertSchema(apiRequestLogs).omit({
  id: true,
  createdAt: true,
});
export const selectApiRequestLogSchema = createSelectSchema(apiRequestLogs);
export type InsertApiRequestLog = typeof insertApiRequestLogSchema._type;
export type SelectApiRequestLog = typeof selectApiRequestLogSchema._type;

// ── aiLogs ───────────────────────────────────────────────────────────────────
export const insertAiLogSchema = createInsertSchema(aiLogs).omit({
  id: true,
  createdAt: true,
});
export const selectAiLogSchema = createSelectSchema(aiLogs);
export type InsertAiLog = typeof insertAiLogSchema._type;
export type SelectAiLog = typeof selectAiLogSchema._type;
