import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { workflowStageChanges } from '../db/schema';

@Injectable()
export class WorkflowStageChangesService {
  constructor(@Inject(DB) private db: DbType) {}

  async findAll(spaceId: number, storyId?: number) {
    const conditions = [eq(workflowStageChanges.spaceId, spaceId)];
    if (storyId !== undefined) {
      conditions.push(eq(workflowStageChanges.storyId, storyId));
    }

    const rows = await this.db
      .select()
      .from(workflowStageChanges)
      .where(and(...conditions))
      .orderBy(desc(workflowStageChanges.createdAt));

    return { workflow_stage_changes: rows.map((r) => this.format(r)) };
  }

  async create(spaceId: number, data: { workflow_stage_id: number; story_id: number; user_id?: number }) {
    const [created] = await this.db
      .insert(workflowStageChanges)
      .values({
        spaceId,
        storyId: data.story_id,
        workflowStageId: data.workflow_stage_id,
        userId: data.user_id ?? null,
      })
      .returning();

    return { workflow_stage_change: this.format(created) };
  }

  private format(r: typeof workflowStageChanges.$inferSelect) {
    return {
      id: Number(r.id),
      space_id: r.spaceId,
      story_id: Number(r.storyId),
      workflow_stage_id: r.workflowStageId,
      user_id: r.userId ? Number(r.userId) : null,
      created_at: r.createdAt,
    };
  }
}
