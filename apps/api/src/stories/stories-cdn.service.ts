import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, ilike, inArray, isNotNull, isNull, or, sql, SQL } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { spaces, stories } from '../db/schema';

@Injectable()
export class StoriesCdnService {
  constructor(@Inject(DB) private db: DbType) {}

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private formatStory(s: typeof stories.$inferSelect, version: 'published' | 'draft' = 'published') {
    return {
      id: Number(s.id),
      uuid: s.uuid,
      name: s.name,
      slug: s.slug,
      full_slug: s.fullSlug,
      path: s.path,
      position: s.position,
      parent_id: s.parentId ? Number(s.parentId) : null,
      group_id: s.groupId,
      is_startpage: s.isStartpage,
      sort_by_date: s.sortByDate ? s.sortByDate.toISOString() : null,
      tag_list: s.tagList as string[],
      content: version === 'draft' ? this.addEditableMetadata(s.content as any, s.spaceId!, Number(s.id)) : s.content,
      created_at: s.createdAt.toISOString(),
      updated_at: s.updatedAt.toISOString(),
      published_at: s.publishedAt?.toISOString() ?? null,
      first_published_at: s.firstPublishedAt?.toISOString() ?? null,
      // CDN-specific fields
      lang: 'default',
      alternates: [],
      translated_slugs: null,
      meta_data: {},
      release_id: null,
      default_full_slug: null,
    };
  }

  private addEditableMetadata(content: any, spaceId: number, storyId: number): any {
    if (!content || typeof content !== 'object') return content;
    if (Array.isArray(content)) {
      return content.map((item) => this.addEditableMetadata(item, spaceId, storyId));
    }
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(content)) {
      if (typeof val === 'object' && val !== null) {
        result[key] = this.addEditableMetadata(val, spaceId, storyId);
      } else {
        result[key] = val;
      }
    }
    if (result._uid && result.component) {
      result._editable = `<!--#storyblok#${JSON.stringify({
        name: result.component,
        space: String(spaceId),
        uid: result._uid,
        id: storyId,
      })}-->`;
    }
    return result;
  }

  // ── List stories ─────────────────────────────────────────────────────────────

  async listStories(
    spaceId: number,
    opts: {
      version?: 'published' | 'draft';
      page?: number;
      perPage?: number;
      startsWith?: string;
      bySlugs?: string[];
      byUuids?: string[];
      excludingSlugs?: string[];
      withTag?: string;
      isStartpage?: boolean;
      searchTerm?: string;
      sortBy?: string;        // e.g. "position:asc" or "created_at:desc"
      filterQuery?: Record<string, any>;
      resolveLinks?: string;
      resolveRelations?: string;
    } = {},
  ) {
    const {
      version = 'published',
      page = 1,
      perPage = 25,
      startsWith,
      bySlugs,
      byUuids,
      excludingSlugs,
      withTag,
      isStartpage,
      searchTerm,
      sortBy,
    } = opts;

    const conditions: (SQL | undefined)[] = [
      eq(stories.spaceId, spaceId),
      isNull(stories.deletedAt),
      eq(stories.isFolder, false),
    ];

    // Version filtering
    if (version === 'published') {
      conditions.push(eq(stories.published, true));
    }
    // draft → all stories (published + drafts)

    // Slug prefix filter
    if (startsWith?.trim()) {
      conditions.push(ilike(stories.fullSlug, `${startsWith.trim()}%`));
    }

    // By slugs filter
    if (bySlugs && bySlugs.length > 0) {
      conditions.push(
        or(...bySlugs.map((slug) => eq(stories.fullSlug, slug.trim()))),
      );
    }

    // By UUIDs filter
    if (byUuids && byUuids.length > 0) {
      conditions.push(
        or(...byUuids.map((uuid) => eq(stories.uuid, uuid.trim()))),
      );
    }

    // Excluding slugs
    if (excludingSlugs && excludingSlugs.length > 0) {
      for (const slug of excludingSlugs) {
        if (slug.trim()) {
          conditions.push(
            sql`${stories.fullSlug} NOT ILIKE ${slug.trim().replace('*', '%')}`,
          );
        }
      }
    }

    // Tag filter
    if (withTag?.trim()) {
      conditions.push(
        sql`${stories.tagList}::text ilike ${'%' + withTag.trim() + '%'}`,
      );
    }

    // Startpage filter
    if (isStartpage !== undefined) {
      conditions.push(eq(stories.isStartpage, isStartpage));
    }

    // Search term
    if (searchTerm?.trim()) {
      conditions.push(
        or(
          ilike(stories.name, `%${searchTerm.trim()}%`),
          sql`${stories.content}::text ilike ${'%' + searchTerm.trim() + '%'}`,
        ),
      );
    }

    const where = and(...conditions);

    // Sorting
    let order = asc(stories.position);
    if (sortBy) {
      const [field, dir] = sortBy.split(':');
      const isDesc = dir === 'desc';
      const col =
        field === 'created_at' ? stories.createdAt :
        field === 'first_published_at' ? stories.firstPublishedAt :
        field === 'published_at' ? stories.publishedAt :
        field === 'updated_at' ? stories.updatedAt :
        field === 'name' ? stories.name :
        stories.position;
      order = isDesc ? desc(col) : asc(col);
    }

    const rows = await this.db
      .select()
      .from(stories)
      .where(where)
      .orderBy(order)
      .limit(Math.min(perPage, 100))
      .offset((page - 1) * perPage);

    // Get cv (space version)
    const [space] = await this.db
      .select({ version: spaces.version })
      .from(spaces)
      .where(eq(spaces.id, spaceId))
      .limit(1);

    return {
      stories: rows.map((s) => this.formatStory(s, version)),
      cv: space?.version ?? 0,
      rels: [],
      links: [],
    };
  }

  // ── Single story ─────────────────────────────────────────────────────────────

  async getStory(
    spaceId: number,
    slugOrId: string,
    opts: { version?: 'published' | 'draft' } = {},
  ) {
    const { version = 'published' } = opts;

    const conditions: (SQL | undefined)[] = [
      eq(stories.spaceId, spaceId),
      isNull(stories.deletedAt),
      eq(stories.isFolder, false),
    ];

    if (version === 'published') {
      conditions.push(eq(stories.published, true));
    }

    // Match by full_slug, slug, uuid, or id
    // Normalize: try both with and without trailing slash
    const isNumeric = /^\d+$/.test(slugOrId);
    if (isNumeric) {
      conditions.push(eq(stories.id, BigInt(slugOrId)));
    } else {
      const s = slugOrId.replace(/\/$/, '');
      conditions.push(
        or(
          eq(stories.fullSlug, s),
          eq(stories.fullSlug, s + '/'),
          eq(stories.slug, s),
          eq(stories.uuid, s),
        ),
      );
    }

    const [row] = await this.db
      .select()
      .from(stories)
      .where(and(...conditions))
      .limit(1);

    if (!row) throw new NotFoundException('Story not found');

    const [space] = await this.db
      .select({ version: spaces.version })
      .from(spaces)
      .where(eq(spaces.id, spaceId))
      .limit(1);

    return {
      story: this.formatStory(row, version),
      cv: space?.version ?? 0,
      rels: [],
      links: [],
    };
  }
}
