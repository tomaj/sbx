import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { storySchedulings } from '../db/schema';

@Injectable()
export class StorySchedulingsService {
  constructor(@Inject(DB) private db: DbType) {}

  async findAll(spaceId: number, byStatus?: string) {
    const conditions: any[] = [eq(storySchedulings.spaceId, spaceId)];
    if (byStatus) {
      conditions.push(eq(storySchedulings.status, byStatus));
    }
    const rows = await this.db
      .select()
      .from(storySchedulings)
      .where(and(...conditions));
    return { story_schedulings: rows.map((r) => this.format(r)) };
  }

  async findOne(spaceId: number, id: number) {
    const [row] = await this.db
      .select()
      .from(storySchedulings)
      .where(and(eq(storySchedulings.id, id), eq(storySchedulings.spaceId, spaceId)));
    if (!row) throw new NotFoundException('Story scheduling not found');
    return { story_scheduling: this.format(row) };
  }

  async create(
    spaceId: number,
    data: { story_id: number; publish_at: string; language?: string },
    userId?: number,
  ) {
    const [row] = await this.db
      .insert(storySchedulings)
      .values({
        spaceId,
        storyId: data.story_id,
        publishAt: new Date(data.publish_at),
        language: data.language ?? '',
        userId: userId ?? null,
        status: 'scheduled',
      })
      .returning();
    return { story_scheduling: this.format(row) };
  }

  async update(
    spaceId: number,
    id: number,
    data: { publish_at?: string; language?: string },
  ) {
    const updates: any = { updatedAt: new Date() };
    if (data.publish_at !== undefined) updates.publishAt = new Date(data.publish_at);
    if (data.language !== undefined) updates.language = data.language;

    const [row] = await this.db
      .update(storySchedulings)
      .set(updates)
      .where(and(eq(storySchedulings.id, id), eq(storySchedulings.spaceId, spaceId)))
      .returning();
    if (!row) throw new NotFoundException('Story scheduling not found');
    return { story_scheduling: this.format(row) };
  }

  async remove(spaceId: number, id: number) {
    const [row] = await this.db
      .delete(storySchedulings)
      .where(and(eq(storySchedulings.id, id), eq(storySchedulings.spaceId, spaceId)))
      .returning();
    if (!row) throw new NotFoundException('Story scheduling not found');
    return { story_scheduling: this.format(row) };
  }

  private format(r: typeof storySchedulings.$inferSelect) {
    return {
      id: r.id,
      space_id: r.spaceId,
      story_id: Number(r.storyId),
      user_id: r.userId ? Number(r.userId) : null,
      language: r.language,
      publish_at: r.publishAt?.toISOString() ?? null,
      status: r.status,
      deleted_at: r.deletedAt?.toISOString() ?? null,
      created_at: r.createdAt?.toISOString() ?? null,
      updated_at: r.updatedAt?.toISOString() ?? null,
    };
  }
}
