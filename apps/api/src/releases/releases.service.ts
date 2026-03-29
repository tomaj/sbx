import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { releases, storyReleases, stories } from '../db/schema';

@Injectable()
export class ReleasesService {
  constructor(@Inject(DB) private db: DbType) {}

  async findAll(spaceId: number) {
    const rows = await this.db
      .select()
      .from(releases)
      .where(eq(releases.spaceId, spaceId))
      .orderBy(desc(releases.createdAt));

    return { releases: rows.map((r) => this.format(r)) };
  }

  async findOne(spaceId: number, id: number) {
    const [row] = await this.db
      .select()
      .from(releases)
      .where(eq(releases.id, id))
      .limit(1);

    if (!row || row.spaceId !== spaceId) return null;
    return { release: this.format(row) };
  }

  async create(spaceId: number, data: { name: string; release_at?: string | null; timezone?: string }) {
    const id = Number(Date.now()) * 1000 + Math.floor(Math.random() * 1000);
    const uuid = crypto.randomUUID();

    const [created] = await this.db
      .insert(releases)
      .values({
        id,
        spaceId,
        uuid,
        name: data.name,
        releaseAt: data.release_at ? new Date(data.release_at) : null,
        timezone: data.timezone ?? null,
      })
      .returning();

    return { release: this.format(created) };
  }

  async update(
    spaceId: number,
    id: number,
    data: { name?: string; release_at?: string | null; timezone?: string; do_release?: boolean },
  ) {
    if (data.do_release) {
      return this.publishRelease(spaceId, id);
    }

    const [updated] = await this.db
      .update(releases)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.release_at !== undefined && { releaseAt: data.release_at ? new Date(data.release_at) : null }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
        updatedAt: new Date(),
      })
      .where(and(eq(releases.id, id), eq(releases.spaceId, spaceId)))
      .returning();

    if (!updated) return null;
    return { release: this.format(updated) };
  }

  async remove(spaceId: number, id: number) {
    await this.db
      .delete(releases)
      .where(and(eq(releases.id, id), eq(releases.spaceId, spaceId)));

    return {};
  }

  async conflictCheck(spaceId: number, releaseId: number) {
    // A conflict exists when a story in this release is also in another release
    const rows = await this.db
      .select({ storyId: storyReleases.storyId, releaseIds: stories.releaseIds })
      .from(storyReleases)
      .innerJoin(stories, eq(stories.id, sql`${storyReleases.storyId}::bigint`))
      .where(eq(storyReleases.releaseId, releaseId));

    const conflictingStoryIds: number[] = [];
    for (const row of rows) {
      const ids = (row.releaseIds as number[]) ?? [];
      if (ids.filter((rid) => rid !== releaseId).length > 0) {
        conflictingStoryIds.push(row.storyId);
      }
    }

    return {
      has_conflicts: conflictingStoryIds.length > 0,
      conflicting_story_ids: conflictingStoryIds,
    };
  }

  private async publishRelease(spaceId: number, releaseId: number) {
    // Apply all story snapshots from this release to main stories
    const snapshots = await this.db
      .select({ storyId: storyReleases.storyId, content: storyReleases.content })
      .from(storyReleases)
      .where(eq(storyReleases.releaseId, releaseId));

    const now = new Date();

    for (const snapshot of snapshots) {
      const storyIdBig = BigInt(snapshot.storyId);
      const d = snapshot.content as {
        name?: string; slug?: string; full_slug?: string;
        content?: Record<string, any>; tag_list?: any;
        path?: string | null; is_startpage?: boolean;
      };

      const [current] = await this.db
        .select({ firstPublishedAt: stories.firstPublishedAt, releaseIds: stories.releaseIds })
        .from(stories)
        .where(and(eq(stories.id, storyIdBig), eq(stories.spaceId, spaceId)))
        .limit(1);

      if (!current) continue;

      const updatedReleaseIds = ((current.releaseIds as number[]) ?? []).filter((id) => id !== releaseId);

      await this.db
        .update(stories)
        .set({
          // Apply all snapshot fields to draft + published state
          ...(d.name !== undefined && { name: d.name }),
          ...(d.slug !== undefined && { slug: d.slug }),
          ...(d.full_slug !== undefined && { fullSlug: d.full_slug }),
          ...(d.content !== undefined && { content: d.content }),
          ...(d.tag_list !== undefined && { tagList: d.tag_list }),
          ...('path' in d && { path: d.path }),
          ...(d.is_startpage !== undefined && { isStartpage: d.is_startpage }),
          publishedData: snapshot.content as Record<string, any>,
          published: true,
          unpublishedChanges: false,
          publishedAt: now,
          firstPublishedAt: current.firstPublishedAt ?? now,
          updatedAt: now,
          releaseIds: updatedReleaseIds,
        })
        .where(and(eq(stories.id, storyIdBig), eq(stories.spaceId, spaceId)));
    }

    // Delete all story_releases entries for this release
    await this.db.delete(storyReleases).where(eq(storyReleases.releaseId, releaseId));

    // Mark release as released
    const [updated] = await this.db
      .update(releases)
      .set({ released: true, updatedAt: now })
      .where(and(eq(releases.id, releaseId), eq(releases.spaceId, spaceId)))
      .returning();

    if (!updated) return null;
    return { release: this.format(updated) };
  }

  private format(r: typeof releases.$inferSelect) {
    return {
      id: Number(r.id),
      name: r.name,
      uuid: r.uuid,
      space_id: r.spaceId,
      release_at: r.releaseAt ?? null,
      released: r.released,
      timezone: r.timezone ?? 'UTC',
      branches_to_deploy: r.branchesToDeploy,
      owner_id: r.ownerId ? Number(r.ownerId) : null,
      users_to_notify_ids: r.usersToNotifyIds,
      public: r.public,
      allowed_user_ids: r.allowedUserIds,
      allowed_space_role_ids: r.allowedSpaceRoleIds,
      allowed_api_key_ids: r.allowedApiKeyIds,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    };
  }
}
