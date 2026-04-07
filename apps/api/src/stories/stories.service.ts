import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DB } from '../db/db.module';
import { DbType } from '../db/db.module';
import { stories, storyReleases } from '../db/schema';
import { JobsClient } from '@sbx/jobs';
import { JOBS_CLIENT } from '../jobs/jobs.module';
import { WebhooksService } from '../webhooks/webhooks.service';
import { WEBHOOK_ACTIONS } from '../webhooks/webhook-actions';
import { StoriesQueryService } from './stories-query.service';
import { StoriesVersionService } from './stories-version.service';

@Injectable()
export class StoriesService {
  constructor(
    @Inject(DB) private db: DbType,
    @Inject(JOBS_CLIENT) private jobs: JobsClient,
    private readonly webhooks: WebhooksService,
    private readonly query: StoriesQueryService,
    private readonly versionService: StoriesVersionService,
  ) {}

  // ─── Mutations ───────────────────────────────────────────────────────────

  async updateStoryAdmin(
    spaceId: number,
    storyId: number,
    data: {
      content?: Record<string, any>;
      name?: string;
      slug?: string;
      tag_list?: string[];
      sort_by_date?: string | null;
      path?: string | null;
      first_published_at?: string | null;
      publish_at?: string | null;
      expire_at?: string | null;
      release_id?: number | null;
      is_startpage?: boolean;
      disable_fe_editor?: boolean;
    },
    authorId?: number | null,
  ) {
    if (data.release_id != null) {
      return this.updateStoryInRelease(spaceId, storyId, data.release_id, {
        name: data.name,
        slug: data.slug,
        content: data.content,
        tag_list: data.tag_list,
        path: 'path' in data ? data.path : undefined,
        is_startpage: data.is_startpage,
      });
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
      unpublishedChanges: true,
      ...(authorId != null && { lastAuthorId: authorId }),
    };

    if (data.content !== undefined) updateData.content = data.content;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.tag_list !== undefined) updateData.tagList = data.tag_list;
    if ('sort_by_date' in data)
      updateData.sortByDate = data.sort_by_date ? new Date(data.sort_by_date) : null;
    if ('path' in data) updateData.path = data.path;
    if ('first_published_at' in data)
      updateData.firstPublishedAt = data.first_published_at
        ? new Date(data.first_published_at)
        : null;
    if ('publish_at' in data)
      updateData.publishAt = data.publish_at ? new Date(data.publish_at) : null;
    if ('expire_at' in data) updateData.expireAt = data.expire_at ? new Date(data.expire_at) : null;
    if ('is_startpage' in data) updateData.isStartpage = data.is_startpage;
    if ('disable_fe_editor' in data) updateData.disableFEEditor = data.disable_fe_editor;

    // Recompute fullSlug when is_startpage or slug changes
    if ('is_startpage' in data || data.slug !== undefined) {
      const [current] = await this.db
        .select({
          slug: stories.slug,
          parentId: stories.parentId,
          isStartpage: stories.isStartpage,
        })
        .from(stories)
        .where(and(eq(stories.id, BigInt(storyId)), eq(stories.spaceId, spaceId)))
        .limit(1);
      if (current) {
        const effectiveSlug = data.slug ?? current.slug;
        const effectiveIsStartpage =
          'is_startpage' in data ? data.is_startpage : current.isStartpage;
        const parentId = current.parentId;
        if (parentId) {
          const [parent] = await this.db
            .select({ fullSlug: stories.fullSlug })
            .from(stories)
            .where(and(eq(stories.id, parentId), eq(stories.spaceId, spaceId)))
            .limit(1);
          if (parent) {
            updateData.fullSlug = effectiveIsStartpage
              ? parent.fullSlug
              : `${parent.fullSlug}/${effectiveSlug}`;
          }
        } else {
          updateData.fullSlug = effectiveIsStartpage ? '' : effectiveSlug;
        }
      }
    }

    await this.db
      .update(stories)
      .set(updateData)
      .where(
        and(
          eq(stories.id, BigInt(storyId)),
          eq(stories.spaceId, spaceId),
          isNull(stories.deletedAt),
        ),
      );

    const storyIdStr = storyId.toString();

    if ('publish_at' in data) {
      await this.jobs.stories.cancelPublish(storyIdStr);
      if (data.publish_at) {
        const delay = new Date(data.publish_at).getTime() - Date.now();
        if (delay > 0) {
          await this.jobs.stories.schedulePublish({ storyId: storyIdStr, spaceId }, delay);
        }
      }
    }

    if ('expire_at' in data) {
      await this.jobs.stories.cancelExpire(storyIdStr);
      if (data.expire_at) {
        const delay = new Date(data.expire_at).getTime() - Date.now();
        if (delay > 0) {
          await this.jobs.stories.scheduleExpire({ storyId: storyIdStr, spaceId }, delay);
        }
      }
    }

    const result = await this.query.getStoryAdmin(spaceId, storyId);
    const s = result.story as Record<string, any>;

    if (data.slug !== undefined) {
      void this.webhooks.dispatch(spaceId, WEBHOOK_ACTIONS.STORY_MOVED, {
        action: 'move',
        space_id: spaceId,
        story_id: storyId,
        full_slug: s.full_slug,
        text: `Story "${s.name}" was moved.`,
      });
    } else if (data.content !== undefined || data.name !== undefined) {
      void this.webhooks.dispatch(spaceId, 'story.updated', {
        action: 'change',
        space_id: spaceId,
        story_id: storyId,
        full_slug: s.full_slug,
        text: `Story "${s.name}" was changed.`,
      });
    }

    this.versionService.logVersion({
      storyId,
      spaceId,
      userId: authorId,
      action: 'save',
      status: 'draft',
      name: s.name,
      slug: s.slug,
      fullSlug: s.full_slug,
      content: (s.content ?? {}) as Record<string, any>,
      tagList: s.tag_list ?? [],
      path: s.path,
      isStartpage: s.is_startpage,
    });

    return result;
  }

  private async updateStoryInRelease(
    spaceId: number,
    storyId: number,
    releaseId: number,
    changes: {
      name?: string;
      slug?: string;
      content?: Record<string, any>;
      tag_list?: string[];
      path?: string | null | undefined;
      is_startpage?: boolean;
    },
  ) {
    const [story] = await this.db
      .select({
        id: stories.id,
        name: stories.name,
        slug: stories.slug,
        fullSlug: stories.fullSlug,
        content: stories.content,
        tagList: stories.tagList,
        path: stories.path,
        isStartpage: stories.isStartpage,
        parentId: stories.parentId,
        releaseIds: stories.releaseIds,
      })
      .from(stories)
      .where(
        and(
          eq(stories.id, BigInt(storyId)),
          eq(stories.spaceId, spaceId),
          isNull(stories.deletedAt),
        ),
      )
      .limit(1);
    if (!story) throw new NotFoundException('Story not found');

    const [existing] = await this.db
      .select({ content: storyReleases.content })
      .from(storyReleases)
      .where(and(eq(storyReleases.storyId, storyId), eq(storyReleases.releaseId, releaseId)))
      .limit(1);

    const existingData = (existing?.content ?? {}) as Record<string, any>;
    const now = new Date();
    const existingIds = (story.releaseIds as number[]) ?? [];

    const effectiveSlug = changes.slug ?? existingData.slug ?? story.slug;
    const effectiveIsStartpage =
      changes.is_startpage ?? existingData.is_startpage ?? story.isStartpage;

    let effectiveFullSlug = existingData.full_slug ?? story.fullSlug;
    if (changes.slug !== undefined || changes.is_startpage !== undefined) {
      if (story.parentId) {
        const [parent] = await this.db
          .select({ fullSlug: stories.fullSlug })
          .from(stories)
          .where(and(eq(stories.id, story.parentId), eq(stories.spaceId, spaceId)))
          .limit(1);
        if (parent) {
          effectiveFullSlug = effectiveIsStartpage
            ? parent.fullSlug
            : `${parent.fullSlug}/${effectiveSlug}`;
        }
      } else {
        effectiveFullSlug = effectiveIsStartpage ? '' : effectiveSlug;
      }
    }

    const snapshot = {
      name: changes.name ?? existingData.name ?? story.name,
      slug: effectiveSlug,
      full_slug: effectiveFullSlug,
      content: changes.content ?? existingData.content ?? story.content,
      tag_list: changes.tag_list ?? existingData.tag_list ?? story.tagList,
      path: 'path' in changes ? changes.path : (existingData.path ?? story.path),
      is_startpage: effectiveIsStartpage,
    };

    await this.db.transaction(async (tx) => {
      await tx
        .insert(storyReleases)
        .values({ storyId, releaseId, content: snapshot, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({
          target: [storyReleases.storyId, storyReleases.releaseId],
          set: { content: snapshot, updatedAt: now },
        });

      if (!existingIds.includes(releaseId)) {
        await tx
          .update(stories)
          .set({ releaseIds: [...existingIds, releaseId], updatedAt: now })
          .where(eq(stories.id, BigInt(storyId)));
      }
    });

    this.versionService.logVersion({
      storyId,
      spaceId,
      releaseId,
      action: 'save',
      status: 'draft',
      name: snapshot.name,
      slug: snapshot.slug,
      fullSlug: snapshot.full_slug,
      content: (snapshot.content ?? {}) as Record<string, any>,
      tagList: snapshot.tag_list ?? [],
      path: snapshot.path,
      isStartpage: snapshot.is_startpage,
    });

    return this.query.getStoryAdmin(spaceId, storyId);
  }

  async publishStory(spaceId: number, storyId: number, userId?: number | null, _lang?: string) {
    const [current] = await this.db
      .select({
        firstPublishedAt: stories.firstPublishedAt,
        name: stories.name,
        fullSlug: stories.fullSlug,
        slug: stories.slug,
        content: stories.content,
        tagList: stories.tagList,
        path: stories.path,
        isStartpage: stories.isStartpage,
      })
      .from(stories)
      .where(and(eq(stories.id, BigInt(storyId)), eq(stories.spaceId, spaceId)))
      .limit(1);

    const now = new Date();
    const publishedData = current
      ? {
          name: current.name,
          slug: current.slug,
          full_slug: current.fullSlug,
          content: current.content,
          tag_list: current.tagList,
          path: current.path,
          is_startpage: current.isStartpage,
        }
      : null;

    await this.db
      .update(stories)
      .set({
        published: true,
        unpublishedChanges: false,
        publishedAt: now,
        firstPublishedAt: current?.firstPublishedAt ?? now,
        updatedAt: now,
        ...(publishedData && { publishedData }),
      })
      .where(
        and(
          eq(stories.id, BigInt(storyId)),
          eq(stories.spaceId, spaceId),
          isNull(stories.deletedAt),
        ),
      );

    void this.webhooks.dispatch(spaceId, WEBHOOK_ACTIONS.STORY_PUBLISHED, {
      action: 'published',
      space_id: spaceId,
      story_id: storyId,
      full_slug: current?.fullSlug ?? '',
      text: `Story "${current?.name ?? storyId}" was published.`,
    });

    if (current) {
      this.versionService.logVersion({
        storyId,
        spaceId,
        userId,
        action: 'publish',
        status: 'published',
        name: current.name,
        slug: current.slug,
        fullSlug: current.fullSlug,
        content: (current.content ?? {}) as Record<string, any>,
        tagList: current.tagList ?? [],
        path: current.path,
        isStartpage: current.isStartpage,
      });
    }

    return this.query.getStoryAdmin(spaceId, storyId);
  }

  async unpublishStory(spaceId: number, storyId: number, userId?: number | null) {
    const [current] = await this.db
      .select({ name: stories.name, fullSlug: stories.fullSlug })
      .from(stories)
      .where(and(eq(stories.id, BigInt(storyId)), eq(stories.spaceId, spaceId)))
      .limit(1);

    await this.db
      .update(stories)
      .set({ published: false, unpublishedChanges: true, updatedAt: new Date() })
      .where(
        and(
          eq(stories.id, BigInt(storyId)),
          eq(stories.spaceId, spaceId),
          isNull(stories.deletedAt),
        ),
      );

    void this.webhooks.dispatch(spaceId, WEBHOOK_ACTIONS.STORY_UNPUBLISHED, {
      action: 'unpublished',
      space_id: spaceId,
      story_id: storyId,
      full_slug: current?.fullSlug ?? '',
      text: `Story "${current?.name ?? storyId}" was unpublished.`,
    });

    if (current) {
      this.versionService.logVersion({
        storyId,
        spaceId,
        userId,
        action: 'unpublish',
        status: 'unpublished',
        name: current.name,
        slug: '',
        fullSlug: current.fullSlug,
        content: {},
        tagList: [],
      });
    }

    return this.query.getStoryAdmin(spaceId, storyId);
  }

  async createStory(
    spaceId: number,
    data: {
      name: string;
      slug: string;
      content?: Record<string, any>;
      parent_id?: number | null;
      tag_list?: string[];
      path?: string | null;
      is_folder?: boolean;
      is_startpage?: boolean;
      first_published_at?: string | null;
      publish_at?: string | null;
      expire_at?: string | null;
    },
    authorId?: number | null,
    releaseId?: number,
  ) {
    const id = BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000));
    const uuid = crypto.randomUUID();

    let fullSlug = data.slug;
    if (data.parent_id) {
      const [parent] = await this.db
        .select({ fullSlug: stories.fullSlug })
        .from(stories)
        .where(and(eq(stories.id, BigInt(data.parent_id)), eq(stories.spaceId, spaceId)))
        .limit(1);
      if (parent) {
        fullSlug = `${parent.fullSlug}/${data.slug}`;
      }
    }

    const contentType = data.content?.component ?? null;
    const now = new Date();
    const lastAuthorId = authorId ?? null;

    await this.db.transaction(async (tx) => {
      await tx.insert(stories).values({
        id,
        spaceId,
        uuid,
        name: data.name,
        slug: data.slug,
        fullSlug,
        path: data.path ?? null,
        parentId: data.parent_id ? BigInt(data.parent_id) : null,
        contentType,
        isFolder: data.is_folder ?? false,
        isStartpage: data.is_startpage ?? false,
        published: false,
        unpublishedChanges: true,
        position: 0,
        tagList: data.tag_list ?? [],
        content: data.content ?? {},
        firstPublishedAt: data.first_published_at ? new Date(data.first_published_at) : null,
        publishAt: data.publish_at ? new Date(data.publish_at) : null,
        expireAt: data.expire_at ? new Date(data.expire_at) : null,
        lastAuthorId,
        createdAt: now,
        updatedAt: now,
      });

      if (releaseId != null) {
        const snapshot = {
          name: data.name,
          slug: data.slug,
          full_slug: fullSlug,
          content: data.content ?? {},
          tag_list: data.tag_list ?? [],
          path: data.path ?? null,
          is_startpage: data.is_startpage ?? false,
        };
        await tx.insert(storyReleases).values({
          storyId: Number(id),
          releaseId,
          content: snapshot,
          createdAt: now,
          updatedAt: now,
        });
        await tx
          .update(stories)
          .set({ releaseIds: [releaseId] })
          .where(eq(stories.id, id));
      }
    });

    void this.webhooks.dispatch(spaceId, 'story.created', {
      action: 'created',
      space_id: spaceId,
      story_id: Number(id),
      full_slug: fullSlug,
      text: `Story "${data.name}" was created.`,
    });

    const storyIdStr = Number(id).toString();
    if (data.publish_at) {
      const delay = new Date(data.publish_at).getTime() - Date.now();
      if (delay > 0) {
        await this.jobs.stories.schedulePublish({ storyId: storyIdStr, spaceId }, delay);
      }
    }
    if (data.expire_at) {
      const delay = new Date(data.expire_at).getTime() - Date.now();
      if (delay > 0) {
        await this.jobs.stories.scheduleExpire({ storyId: storyIdStr, spaceId }, delay);
      }
    }

    this.versionService.logVersion({
      storyId: Number(id),
      spaceId,
      userId: authorId,
      action: 'create',
      status: 'draft',
      name: data.name,
      slug: data.slug,
      fullSlug,
      content: data.content ?? {},
      tagList: data.tag_list ?? [],
      path: data.path,
      isStartpage: data.is_startpage,
    });

    return this.query.getStoryAdmin(spaceId, Number(id));
  }

  async deleteStory(spaceId: number, storyId: number) {
    const [deleted] = await this.db
      .delete(stories)
      .where(and(eq(stories.id, BigInt(storyId)), eq(stories.spaceId, spaceId)))
      .returning();

    if (deleted) {
      void this.webhooks.dispatch(spaceId, WEBHOOK_ACTIONS.STORY_DELETED, {
        action: 'deleted',
        space_id: spaceId,
        story_id: storyId,
        full_slug: deleted.fullSlug ?? '',
        text: `Story "${deleted.name ?? storyId}" was deleted.`,
      });

      return { story: this.query.formatStory(deleted) };
    }

    return { story: {} };
  }

  async partialUpdateStory(
    spaceId: number,
    storyId: number,
    updates: { favourite_for_user_ids?: number[] },
  ) {
    const [story] = await this.db
      .select()
      .from(stories)
      .where(
        and(
          eq(stories.id, BigInt(storyId)),
          eq(stories.spaceId, spaceId),
          isNull(stories.deletedAt),
        ),
      )
      .limit(1);
    if (!story) throw new NotFoundException('Story not found');

    if (updates.favourite_for_user_ids === undefined) {
      return { story: this.query.formatStory(story) };
    }

    const [updated] = await this.db
      .update(stories)
      .set({ favouriteForUserIds: updates.favourite_for_user_ids })
      .where(eq(stories.id, BigInt(storyId)))
      .returning();

    return { story: this.query.formatStory(updated) };
  }
}
