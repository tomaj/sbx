import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, ilike } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { tags } from '../db/schema';

@Injectable()
export class TagsService {
  constructor(@Inject(DB) private db: DbType) {}

  async findAll(spaceId: number) {
    const rows = await this.db
      .select()
      .from(tags)
      .where(eq(tags.spaceId, spaceId))
      .orderBy(asc(tags.name));

    return {
      tags: rows.map((t) => ({
        name: t.name,
        taggings_count: t.taggingsCount,
      })),
    };
  }

  async listAdmin(
    spaceId: number,
    opts: { search?: string; sortField?: string; sortDir?: string },
  ) {
    const conditions: ReturnType<typeof eq>[] = [eq(tags.spaceId, spaceId)];
    if (opts.search) {
      conditions.push(ilike(tags.name, `%${opts.search}%`) as any);
    }

    const orderByCol =
      opts.sortField === 'taggings_count' ? tags.taggingsCount : tags.name;
    const orderBy =
      opts.sortDir === 'desc' ? desc(orderByCol) : asc(orderByCol);

    const rows = await this.db
      .select()
      .from(tags)
      .where(and(...conditions))
      .orderBy(orderBy);

    return {
      tags: rows.map((t) => ({
        id: t.id,
        name: t.name,
        taggings_count: t.taggingsCount,
      })),
      total: rows.length,
    };
  }

  async createTag(spaceId: number, body: { name: string }) {
    const [row] = await this.db
      .insert(tags)
      .values({ spaceId, name: body.name })
      .returning();

    return { tag: { id: row.id, name: row.name, taggings_count: row.taggingsCount } };
  }

  async updateTag(id: number, spaceId: number, body: { name: string }) {
    const [row] = await this.db
      .update(tags)
      .set({ name: body.name })
      .where(and(eq(tags.id, id), eq(tags.spaceId, spaceId)))
      .returning();

    if (!row) throw new NotFoundException('Tag not found');

    return { tag: { id: row.id, name: row.name, taggings_count: row.taggingsCount } };
  }
}
