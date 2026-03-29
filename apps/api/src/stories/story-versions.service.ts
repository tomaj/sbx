import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { storyVersions, users } from '../db/schema';

@Injectable()
export class StoryVersionsService {
  constructor(@Inject(DB) private db: DbType) {}

  async listVersions(opts: {
    spaceId: number;
    storyId: number;
    releaseId?: number;
    page: number;
    perPage: number;
    showContent: boolean;
  }) {
    const { spaceId, storyId, releaseId, page, perPage, showContent } = opts;
    const offset = (page - 1) * perPage;

    const conditions = [
      eq(storyVersions.spaceId, spaceId),
      eq(storyVersions.storyId, storyId),
    ];

    // by_release_id=0 means "no release" (main branch only)
    if (releaseId !== undefined) {
      if (releaseId === 0) {
        conditions.push(isNull(storyVersions.releaseId));
      } else {
        conditions.push(eq(storyVersions.releaseId, releaseId));
      }
    }

    const where = and(...conditions);

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(storyVersions)
      .where(where);

    const rows = await this.db
      .select({
        id: storyVersions.id,
        storyId: storyVersions.storyId,
        spaceId: storyVersions.spaceId,
        releaseId: storyVersions.releaseId,
        userId: storyVersions.userId,
        action: storyVersions.action,
        status: storyVersions.status,
        name: storyVersions.name,
        slug: storyVersions.slug,
        fullSlug: storyVersions.fullSlug,
        ...(showContent ? { content: storyVersions.content } : {}),
        tagList: storyVersions.tagList,
        path: storyVersions.path,
        isStartpage: storyVersions.isStartpage,
        createdAt: storyVersions.createdAt,
      })
      .from(storyVersions)
      .where(where)
      .orderBy(desc(storyVersions.createdAt))
      .limit(perPage)
      .offset(offset);

    // Fetch user info for all unique userIds
    const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean))] as number[];
    const userMap = new Map<number, { id: number; name: string; email: string; avatar_url: string | null }>();

    if (userIds.length > 0) {
      const userRows = await this.db
        .select({ id: users.id, firstname: users.firstname, lastname: users.lastname, email: users.email, avatar: users.avatar })
        .from(users)
        .where(inArray(users.id, userIds));
      for (const u of userRows) {
        const name = [u.firstname, u.lastname].filter(Boolean).join(' ') || u.email;
        userMap.set(u.id, { id: u.id, name, email: u.email, avatar_url: u.avatar });
      }
    }

    const story_versions = rows.map((r) => ({
      id: r.id,
      story_id: r.storyId,
      release_id: r.releaseId ?? null,
      user_id: r.userId ?? null,
      user: r.userId ? (userMap.get(r.userId) ?? null) : null,
      action: r.action,
      status: r.status,
      name: r.name,
      slug: r.slug,
      full_slug: r.fullSlug,
      tag_list: r.tagList,
      path: r.path ?? null,
      is_startpage: r.isStartpage,
      created_at: r.createdAt,
      ...(showContent ? { content: (r as any).content } : {}),
    }));

    return { story_versions, total };
  }

  async getVersion(spaceId: number, versionId: number) {
    const [row] = await this.db
      .select()
      .from(storyVersions)
      .where(and(eq(storyVersions.id, versionId), eq(storyVersions.spaceId, spaceId)))
      .limit(1);
    return row ?? null;
  }

  /** Compare two versions: returns flat list of fields that differ */
  async compareVersions(spaceId: number, storyId: number, versionId: number) {
    // Fetch latest version for this story (no release, most recent)
    const [latest] = await this.db
      .select()
      .from(storyVersions)
      .where(and(
        eq(storyVersions.spaceId, spaceId),
        eq(storyVersions.storyId, storyId),
        isNull(storyVersions.releaseId),
      ))
      .orderBy(desc(storyVersions.createdAt))
      .limit(1);

    const [target] = await this.db
      .select()
      .from(storyVersions)
      .where(and(eq(storyVersions.id, versionId), eq(storyVersions.spaceId, spaceId)))
      .limit(1);

    if (!latest || !target) return { changes: [], latest: null, target: null };

    const changes = diffContent(
      (latest.content ?? {}) as Record<string, any>,
      (target.content ?? {}) as Record<string, any>,
    );

    return {
      latest: formatVersion(latest),
      target: formatVersion(target),
      changes,
    };
  }
}

function formatVersion(v: any) {
  return {
    id: v.id,
    story_id: v.storyId,
    action: v.action,
    status: v.status,
    name: v.name,
    slug: v.slug,
    full_slug: v.fullSlug,
    content: v.content,
    tag_list: v.tagList,
    path: v.path,
    is_startpage: v.isStartpage,
    created_at: v.createdAt,
  };
}

/** Recursively diff two content objects, returning changed field paths */
function diffContent(a: Record<string, any>, b: Record<string, any>, prefix = ''): Array<{ path: string; old: any; new: any }> {
  const changes: Array<{ path: string; old: any; new: any }> = [];
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const key of keys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const valA = a[key];
    const valB = b[key];

    if (JSON.stringify(valA) !== JSON.stringify(valB)) {
      if (
        valA && valB &&
        typeof valA === 'object' && typeof valB === 'object' &&
        !Array.isArray(valA) && !Array.isArray(valB)
      ) {
        changes.push(...diffContent(valA, valB, path));
      } else {
        changes.push({ path, old: valA ?? null, new: valB ?? null });
      }
    }
  }

  return changes;
}
