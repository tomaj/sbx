import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, ilike, isNull } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { stories } from '../db/schema';

@Injectable()
export class LinksCdnService {
  constructor(@Inject(DB) private db: DbType) {}

  private formatLink(s: typeof stories.$inferSelect, includeDates = false) {
    const link: Record<string, any> = {
      id: Number(s.id),
      uuid: s.uuid,
      slug: s.fullSlug,
      path: s.path,
      parent_id: s.parentId ? Number(s.parentId) : null,
      name: s.name,
      is_folder: s.isFolder,
      published: s.published,
      is_startpage: s.isStartpage,
      position: s.position,
      real_path: s.path ? `/${s.path}` : `/${s.slug}`,
    };
    if (includeDates) {
      link.created_at = s.createdAt.toISOString();
      link.updated_at = s.updatedAt.toISOString();
      link.published_at = s.publishedAt?.toISOString() ?? null;
    }
    return link;
  }

  async listLinks(
    spaceId: number,
    opts: {
      version?: 'published' | 'draft';
      startsWith?: string;
      withParent?: number;
      includeDates?: boolean;
      page?: number;
      perPage?: number;
    } = {},
  ) {
    const {
      version = 'published',
      startsWith,
      withParent,
      includeDates = false,
      page = 1,
      perPage = 25,
    } = opts;

    const conditions: any[] = [
      eq(stories.spaceId, spaceId),
      isNull(stories.deletedAt),
    ];

    if (version === 'published') {
      conditions.push(eq(stories.published, true));
    }

    if (startsWith?.trim()) {
      conditions.push(ilike(stories.fullSlug, `${startsWith.trim()}%`));
    }

    if (withParent !== undefined) {
      if (withParent === 0) {
        conditions.push(isNull(stories.parentId));
      } else {
        conditions.push(eq(stories.parentId, BigInt(withParent)));
      }
    }

    const rows = await this.db
      .select()
      .from(stories)
      .where(and(...conditions))
      .orderBy(asc(stories.position))
      .limit(Math.min(perPage, 1000))
      .offset((page - 1) * perPage);

    const linksMap: Record<string, any> = {};
    for (const s of rows) {
      linksMap[s.uuid] = this.formatLink(s, includeDates);
    }

    return { links: linksMap };
  }

  async getLink(spaceId: number, uuid: string) {
    const [row] = await this.db
      .select()
      .from(stories)
      .where(
        and(
          eq(stories.spaceId, spaceId),
          eq(stories.uuid, uuid),
          isNull(stories.deletedAt),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Link not found');

    return {
      link: { [row.uuid]: this.formatLink(row, true) },
    };
  }
}
