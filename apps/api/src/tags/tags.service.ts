import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, ilike, sql } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { stories, tags } from '../db/schema';

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

  async findAllCdn(
    spaceId: number,
    opts: { startsWith?: string; version?: 'published' | 'draft' } = {},
  ) {
    const { startsWith, version = 'published' } = opts;

    if (startsWith?.trim()) {
      // When starts_with is given, derive tags from stories matching the prefix
      const storyConditions: any[] = [
        eq(stories.spaceId, spaceId),
        ilike(stories.fullSlug, `${startsWith.trim()}%`),
        sql`${stories.deletedAt} IS NULL`,
        eq(stories.isFolder, false),
      ];
      if (version === 'published') {
        storyConditions.push(eq(stories.published, true));
      }

      const rows = await this.db
        .select({ tagList: stories.tagList })
        .from(stories)
        .where(and(...storyConditions));

      // Aggregate tag counts
      const tagCounts = new Map<string, number>();
      for (const row of rows) {
        const tagList = row.tagList as string[];
        if (Array.isArray(tagList)) {
          for (const tag of tagList) {
            if (tag) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
          }
        }
      }

      const result = Array.from(tagCounts.entries())
        .map(([name, count]) => ({ name, taggings_count: count }))
        .sort((a, b) => a.name.localeCompare(b.name));

      return { tags: result };
    }

    // No starts_with — query tags table directly
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

  async listMapi(
    spaceId: number,
    opts: {
      search?: string;
      sortBy?: string;
      allTags?: boolean;
      page?: number;
      perPage?: number;
    } = {},
  ) {
    const page = Math.max(1, opts.page ?? 1);
    const perPage = Math.min(100, Math.max(1, opts.perPage ?? 25));

    const conditions: ReturnType<typeof eq>[] = [eq(tags.spaceId, spaceId)];
    if (opts.search) {
      conditions.push(ilike(tags.name, `%${opts.search}%`) as any);
    }

    let orderBy: ReturnType<typeof asc>;
    if (opts.sortBy === 'taggings_count:desc') {
      orderBy = desc(tags.taggingsCount) as any;
    } else if (opts.sortBy === 'taggings_count:asc') {
      orderBy = asc(tags.taggingsCount);
    } else if (opts.sortBy === 'name:desc') {
      orderBy = desc(tags.name) as any;
    } else {
      orderBy = asc(tags.name);
    }

    const rows = await this.db
      .select()
      .from(tags)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(perPage)
      .offset((page - 1) * perPage);

    return {
      tags: rows.map((t) => ({
        name: t.name,
        taggings_count: t.taggingsCount,
        ...(opts.allTags ? { tag_on_stories: t.taggingsCount } : {}),
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

  async createTag(spaceId: number, body: { name: string; storyId?: number }) {
    const [row] = await this.db
      .insert(tags)
      .values({ spaceId, name: body.name })
      .returning();

    // If story_id provided, associate tag with story
    if (body.storyId) {
      const [story] = await this.db
        .select({ tagList: stories.tagList })
        .from(stories)
        .where(and(eq(stories.id, BigInt(body.storyId)), eq(stories.spaceId, spaceId)));
      if (story) {
        const currentTags = (story.tagList as string[]) ?? [];
        if (!currentTags.includes(row.name)) {
          await this.db
            .update(stories)
            .set({ tagList: [...currentTags, row.name] })
            .where(eq(stories.id, BigInt(body.storyId)));
        }
      }
    }

    return {
      tag: {
        name: row.name,
        ...(body.storyId ? { story_id: body.storyId } : {}),
      },
    };
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

  async deleteTag(id: number, spaceId: number) {
    const [row] = await this.db
      .delete(tags)
      .where(and(eq(tags.id, id), eq(tags.spaceId, spaceId)))
      .returning();

    if (!row) throw new NotFoundException('Tag not found');

    return {};
  }

  async deleteTagByName(name: string, spaceId: number) {
    const [row] = await this.db
      .delete(tags)
      .where(and(eq(tags.name, name), eq(tags.spaceId, spaceId)))
      .returning();

    if (!row) throw new NotFoundException('Tag not found');
  }
}
