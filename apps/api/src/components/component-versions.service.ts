import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, inArray } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { componentVersions, users } from '../db/schema';

@Injectable()
export class ComponentVersionsService {
  constructor(@Inject(DB) private db: DbType) {}

  /** Save a snapshot when a component is created or updated (fire-and-forget) */
  saveVersion(params: {
    componentId: number;
    spaceId: number;
    userId?: number | null;
    event: 'create' | 'update';
    schema: Record<string, any>;
    name: string;
    displayName?: string | null;
  }) {
    void this.db
      .insert(componentVersions)
      .values({
        componentId: params.componentId,
        spaceId: params.spaceId,
        userId: params.userId ?? null,
        event: params.event,
        schema: params.schema ?? {},
        name: params.name,
        displayName: params.displayName ?? null,
        isDraft: true,
      })
      .catch(() => { /* non-critical */ });
  }

  async listVersions(opts: {
    spaceId: number;
    componentId: number;
    page: number;
    perPage: number;
  }) {
    const { spaceId, componentId, page, perPage } = opts;
    const offset = (page - 1) * perPage;

    const where = and(
      eq(componentVersions.spaceId, spaceId),
      eq(componentVersions.componentId, componentId),
    );

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(componentVersions)
      .where(where);

    const rows = await this.db
      .select()
      .from(componentVersions)
      .where(where)
      .orderBy(desc(componentVersions.createdAt))
      .limit(perPage)
      .offset(offset);

    // Fetch authors
    const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean))] as number[];
    const userMap = new Map<number, { id: number; name: string; avatar_url: string | null }>();

    if (userIds.length > 0) {
      const userRows = await this.db
        .select({ id: users.id, firstname: users.firstname, lastname: users.lastname, email: users.email, avatar: users.avatar })
        .from(users)
        .where(inArray(users.id, userIds));
      for (const u of userRows) {
        const name = [u.firstname, u.lastname].filter(Boolean).join(' ') || u.email;
        userMap.set(u.id, { id: u.id, name, avatar_url: u.avatar });
      }
    }

    const versions = rows.map((r) => {
      const user = r.userId ? (userMap.get(r.userId) ?? null) : null;
      return {
        id: r.id,
        event: r.event,
        created_at: r.createdAt,
        author_id: r.userId ? String(r.userId) : null,
        author: user?.name ?? null,
        author_avatar: user?.avatar_url ?? null,
        item_id: r.componentId,
        is_draft: r.isDraft,
      };
    });

    return { versions, total };
  }

  async getVersion(spaceId: number, componentId: number, versionId: number) {
    const [row] = await this.db
      .select()
      .from(componentVersions)
      .where(
        and(
          eq(componentVersions.id, versionId),
          eq(componentVersions.componentId, componentId),
          eq(componentVersions.spaceId, spaceId),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Component version not found');

    return {
      component_version: {
        id: row.id,
        component_id: row.componentId,
        event: row.event,
        schema: row.schema,
        name: row.name,
        display_name: row.displayName,
        is_draft: row.isDraft,
        created_at: row.createdAt,
      },
    };
  }

  async getVersionForRestore(spaceId: number, componentId: number, versionId: number) {
    const [version] = await this.db
      .select()
      .from(componentVersions)
      .where(
        and(
          eq(componentVersions.id, versionId),
          eq(componentVersions.componentId, componentId),
          eq(componentVersions.spaceId, spaceId),
        ),
      )
      .limit(1);

    if (!version) throw new NotFoundException('Component version not found');
    return version;
  }
}
