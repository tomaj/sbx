import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { workflows, workflowStages } from '../db/schema';

@Injectable()
export class WorkflowsService {
  constructor(@Inject(DB) private db: DbType) {}

  // ─── List ──────────────────────────────────────────────────────────────────

  async adminList(spaceId: number) {
    const wfs = await this.db
      .select()
      .from(workflows)
      .where(eq(workflows.spaceId, spaceId))
      .orderBy(asc(workflows.id));

    const stages = await this.db
      .select()
      .from(workflowStages)
      .where(eq(workflowStages.spaceId, spaceId))
      .orderBy(asc(workflowStages.position));

    return {
      workflows: wfs.map((w) => ({
        ...this.formatWorkflow(w),
        stages: stages.filter((s) => s.workflowId === w.id).map(this.formatStage),
      })),
    };
  }

  // ─── Workflow CRUD ─────────────────────────────────────────────────────────

  async adminGetWorkflow(spaceId: number, id: number) {
    const [wf] = await this.db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, id), eq(workflows.spaceId, spaceId)))
      .limit(1);
    if (!wf) return null;

    const stages = await this.db
      .select()
      .from(workflowStages)
      .where(eq(workflowStages.workflowId, id))
      .orderBy(asc(workflowStages.position));

    return { workflow: { ...this.formatWorkflow(wf), stages: stages.map(this.formatStage) } };
  }

  async adminCreate(spaceId: number, data: { name: string; contentTypes?: string[]; isDefault?: boolean }) {
    const existing = await this.db.select({ id: workflows.id }).from(workflows).orderBy(desc(workflows.id)).limit(1);
    const nextId = existing.length > 0 ? (existing[0].id as number) + 1 : 1;

    const [created] = await this.db
      .insert(workflows)
      .values({
        id: nextId,
        spaceId,
        name: data.name,
        contentTypes: data.contentTypes ?? [],
        isDefault: data.isDefault ?? false,
      })
      .returning();

    return { workflow: { ...this.formatWorkflow(created), stages: [] } };
  }

  async adminUpdate(spaceId: number, id: number, data: { name?: string; contentTypes?: string[]; isDefault?: boolean }) {
    const [updated] = await this.db
      .update(workflows)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.contentTypes !== undefined && { contentTypes: data.contentTypes }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
        updatedAt: new Date(),
      })
      .where(and(eq(workflows.id, id), eq(workflows.spaceId, spaceId)))
      .returning();
    if (!updated) return null;

    const stages = await this.db
      .select()
      .from(workflowStages)
      .where(eq(workflowStages.workflowId, id))
      .orderBy(asc(workflowStages.position));

    return { workflow: { ...this.formatWorkflow(updated), stages: stages.map(this.formatStage) } };
  }

  async adminDelete(spaceId: number, id: number) {
    await this.db
      .delete(workflows)
      .where(and(eq(workflows.id, id), eq(workflows.spaceId, spaceId)));
    return { deleted: true };
  }

  // ─── Stage CRUD ────────────────────────────────────────────────────────────

  async adminCreateStage(
    spaceId: number,
    workflowId: number,
    data: Partial<typeof workflowStages.$inferInsert> & { name: string },
  ) {
    const existing = await this.db
      .select({ id: workflowStages.id })
      .from(workflowStages)
      .orderBy(desc(workflowStages.id))
      .limit(1);
    const nextId = existing.length > 0 ? (existing[0].id as number) + 1 : 1;

    const maxPos = await this.db
      .select({ pos: workflowStages.position })
      .from(workflowStages)
      .where(eq(workflowStages.workflowId, workflowId))
      .orderBy(desc(workflowStages.position))
      .limit(1);
    const nextPos = maxPos.length > 0 ? maxPos[0].pos + 1 : 1;

    const [created] = await this.db
      .insert(workflowStages)
      .values({
        id: nextId,
        workflowId,
        spaceId,
        name: data.name,
        color: data.color ?? '#babcb6',
        position: nextPos,
        isDefault: data.isDefault ?? false,
        allowPublish: data.allowPublish ?? false,
        allowAllStages: data.allowAllStages ?? true,
        allowAllUsers: data.allowAllUsers ?? true,
        storyEditingLocked: data.storyEditingLocked ?? false,
        autoRemoveAssignee: data.autoRemoveAssignee ?? false,
        userIds: data.userIds ?? [],
        spaceRoleIds: data.spaceRoleIds ?? [],
        workflowStageIds: data.workflowStageIds ?? [],
      })
      .returning();

    return { workflow_stage: this.formatStage(created) };
  }

  async adminUpdateStage(
    spaceId: number,
    stageId: number,
    data: Partial<{
      name: string;
      color: string;
      position: number;
      isDefault: boolean;
      allowPublish: boolean;
      allowAllStages: boolean;
      allowAllUsers: boolean;
      storyEditingLocked: boolean;
      autoRemoveAssignee: boolean;
    }>,
  ) {
    const [updated] = await this.db
      .update(workflowStages)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(workflowStages.id, stageId), eq(workflowStages.spaceId, spaceId)))
      .returning();
    if (!updated) return null;
    return { workflow_stage: this.formatStage(updated) };
  }

  async adminDeleteStage(spaceId: number, stageId: number) {
    await this.db
      .delete(workflowStages)
      .where(and(eq(workflowStages.id, stageId), eq(workflowStages.spaceId, spaceId)));
    return { deleted: true };
  }

  async listStages(spaceId: number) {
    const stages = await this.db
      .select()
      .from(workflowStages)
      .where(eq(workflowStages.spaceId, spaceId))
      .orderBy(asc(workflowStages.position));
    return { workflow_stages: stages.map(this.formatStage) };
  }

  async getStage(spaceId: number, id: number) {
    const [stage] = await this.db
      .select()
      .from(workflowStages)
      .where(and(eq(workflowStages.id, id), eq(workflowStages.spaceId, spaceId)))
      .limit(1);
    if (!stage) return null;
    return { workflow_stage: this.formatStage(stage) };
  }

  async createStage(
    spaceId: number,
    data: {
      name: string;
      workflow_id: number;
      color?: string;
      position?: number;
      allow_publish?: boolean;
      allow_all_users?: boolean;
    },
  ) {
    return this.adminCreateStage(spaceId, data.workflow_id, {
      name: data.name,
      color: data.color,
      allowPublish: data.allow_publish,
      allowAllUsers: data.allow_all_users,
    });
  }

  async updateStage(
    spaceId: number,
    id: number,
    data: {
      name?: string;
      color?: string;
      position?: number;
      allow_publish?: boolean;
      allow_all_users?: boolean;
    },
  ) {
    return this.adminUpdateStage(spaceId, id, {
      name: data.name,
      color: data.color,
      position: data.position,
      allowPublish: data.allow_publish,
      allowAllUsers: data.allow_all_users,
    });
  }

  async deleteStage(spaceId: number, id: number) {
    return this.adminDeleteStage(spaceId, id);
  }

  // ─── Format ────────────────────────────────────────────────────────────────

  private formatWorkflow(w: typeof workflows.$inferSelect) {
    return {
      id: w.id,
      space_id: w.spaceId,
      name: w.name,
      content_types: w.contentTypes ?? [],
      is_default: w.isDefault,
      created_at: w.createdAt,
      updated_at: w.updatedAt,
    };
  }

  private formatStage(s: typeof workflowStages.$inferSelect) {
    return {
      id: s.id,
      workflow_id: s.workflowId,
      space_id: s.spaceId,
      name: s.name,
      color: s.color,
      position: s.position,
      is_default: s.isDefault,
      allow_publish: s.allowPublish,
      allow_all_stages: s.allowAllStages,
      allow_admin_publish: s.allowAdminPublish,
      allow_all_users: s.allowAllUsers,
      allow_admin_change: s.allowAdminChange,
      allow_editor_change: s.allowEditorChange,
      story_editing_locked: s.storyEditingLocked,
      allow_none_for_next_stages: s.allowNoneForNextStages,
      auto_remove_assignee: s.autoRemoveAssignee,
      after_publish_id: s.afterPublishId,
      user_ids: s.userIds ?? [],
      space_role_ids: s.spaceRoleIds ?? [],
      workflow_stage_ids: s.workflowStageIds ?? [],
    };
  }
}
