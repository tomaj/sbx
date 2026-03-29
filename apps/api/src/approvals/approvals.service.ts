import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { approvals, stories } from '../db/schema';

@Injectable()
export class ApprovalsService {
  constructor(@Inject(DB) private db: DbType) {}

  async findAll(spaceId: number, approverId?: number, withStory = false) {
    const conditions = [eq(approvals.spaceId, spaceId)];
    if (approverId !== undefined) {
      conditions.push(eq(approvals.approverId, approverId));
    }

    if (withStory) {
      const rows = await this.db
        .select({
          id: approvals.id,
          spaceId: approvals.spaceId,
          storyId: approvals.storyId,
          approverId: approvals.approverId,
          status: approvals.status,
          createdAt: approvals.createdAt,
          updatedAt: approvals.updatedAt,
          storyName: stories.name,
          storyFullSlug: stories.fullSlug,
        })
        .from(approvals)
        .leftJoin(stories, and(sql`${stories.id} = ${approvals.storyId}`, eq(stories.spaceId, spaceId)))
        .where(and(...conditions))
        .orderBy(desc(approvals.createdAt));

      return {
        approvals: rows.map((r) => ({
          ...this.format(r as typeof approvals.$inferSelect),
          story_name: r.storyName ?? null,
          story_full_slug: r.storyFullSlug ?? null,
        })),
      };
    }

    const rows = await this.db
      .select()
      .from(approvals)
      .where(and(...conditions))
      .orderBy(desc(approvals.createdAt));

    return { approvals: rows.map((r) => this.format(r)) };
  }

  async findOne(spaceId: number, id: number) {
    const [row] = await this.db
      .select()
      .from(approvals)
      .where(and(eq(approvals.id, id), eq(approvals.spaceId, spaceId)))
      .limit(1);

    if (!row) return null;
    return { approval: this.format(row) };
  }

  async create(spaceId: number, data: { approver_id: number; story_id: number }) {
    const [created] = await this.db
      .insert(approvals)
      .values({
        spaceId,
        storyId: data.story_id,
        approverId: data.approver_id,
      })
      .returning();

    return { approval: this.format(created) };
  }

  async remove(spaceId: number, id: number) {
    await this.db
      .delete(approvals)
      .where(and(eq(approvals.id, id), eq(approvals.spaceId, spaceId)));

    return {};
  }

  private format(r: typeof approvals.$inferSelect) {
    return {
      id: Number(r.id),
      space_id: r.spaceId,
      story_id: Number(r.storyId),
      approver_id: Number(r.approverId),
      status: r.status,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    };
  }
}
