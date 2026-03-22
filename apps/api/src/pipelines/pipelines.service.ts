import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { pipelines } from '../db/schema';

@Injectable()
export class PipelinesService {
  constructor(@Inject(DB) private db: DbType) {}

  private format(row: typeof pipelines.$inferSelect) {
    return {
      id: row.id,
      space_id: row.spaceId,
      name: row.name,
      preview_url: row.previewUrl,
      source_of_sync: row.sourceOfSync,
      position: row.position,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  async list(spaceId: number) {
    const rows = await this.db
      .select()
      .from(pipelines)
      .where(eq(pipelines.spaceId, spaceId))
      .orderBy(asc(pipelines.position), asc(pipelines.id));
    return { pipelines: rows.map((r) => this.format(r)) };
  }

  async create(spaceId: number, data: { name: string; preview_url?: string; source_of_sync?: string }) {
    const [row] = await this.db
      .insert(pipelines)
      .values({
        spaceId,
        name: data.name,
        previewUrl: data.preview_url ?? '',
        sourceOfSync: data.source_of_sync ?? 'preview',
      })
      .returning();
    return { pipeline: this.format(row) };
  }

  async update(
    spaceId: number,
    id: number,
    data: { name?: string; preview_url?: string; source_of_sync?: string },
  ) {
    const [row] = await this.db
      .update(pipelines)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.preview_url !== undefined && { previewUrl: data.preview_url }),
        ...(data.source_of_sync !== undefined && { sourceOfSync: data.source_of_sync }),
        updatedAt: new Date(),
      })
      .where(eq(pipelines.id, id))
      .returning();
    if (!row || row.spaceId !== spaceId) return null;
    return { pipeline: this.format(row) };
  }

  async remove(spaceId: number, id: number) {
    const [row] = await this.db
      .delete(pipelines)
      .where(eq(pipelines.id, id))
      .returning();
    if (!row || row.spaceId !== spaceId) return null;
    return { pipeline: this.format(row) };
  }
}
