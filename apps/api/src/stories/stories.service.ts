import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SQL, and, asc, count, desc, eq, gt, gte, ilike, isNull, isNotNull, lt, lte, ne, notInArray, or, sql, inArray } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { stories, tags, components, componentGroups, storyReleases, storyVersions, releases, users, workflowStageChanges } from '../db/schema';
import { JobsClient } from '@sbx/jobs';
import { JOBS_CLIENT } from '../jobs/jobs.module';
import { WebhooksService } from '../webhooks/webhooks.service';
import { WEBHOOK_ACTIONS } from '../webhooks/webhook-actions';

@Injectable()
export class StoriesService {
  constructor(
    @Inject(DB) private db: DbType,
    @Inject(JOBS_CLIENT) private jobs: JobsClient,
    private readonly webhooks: WebhooksService,
  ) {}

  private logVersion(params: {
    storyId: number;
    spaceId: number;
    userId?: number | null;
    releaseId?: number | null;
    action: 'create' | 'save' | 'publish' | 'unpublish';
    status: 'draft' | 'published' | 'unpublished';
    name: string;
    slug: string;
    fullSlug: string;
    content: Record<string, any>;
    tagList: any;
    path?: string | null;
    isStartpage?: boolean;
  }) {
    void this.db.execute(sql`SELECT nextval('story_versions_id_seq')`).then(({ rows }) => {
      const versionId = Number((rows[0] as any).nextval);
      return this.db.insert(storyVersions).values({
        id: versionId,
        storyId: params.storyId,
        spaceId: params.spaceId,
        userId: params.userId ?? null,
        releaseId: params.releaseId ?? null,
        action: params.action,
        status: params.status,
        name: params.name,
        slug: params.slug,
        fullSlug: params.fullSlug,
        content: params.content,
        tagList: params.tagList ?? [],
        path: params.path ?? null,
        isStartpage: params.isStartpage ?? false,
      });
    }).catch(() => { /* non-critical — never block main flow */ });
  }

  async listStoriesAdmin(
    spaceId: number,
    opts: {
      page?: number;
      perPage?: number;
      search?: string;
      sortField?: string;
      sortDir?: 'asc' | 'desc';
      parentId?: bigint | null | undefined;
      contentType?: string;
      tag?: string;
      block?: string;
      published?: boolean;
      uuid?: string;
      storyId?: number;
      inRelease?: number;
      byIds?: bigint[];
      byUuids?: string[];
      byUuidsOrdered?: string[];
      excludingIds?: bigint[];
      favouriteOf?: number;
      mine?: number;
      folderOnly?: boolean;
      storyOnly?: boolean;
      startsWith?: string;
      inTrash?: boolean;
      withSlug?: string;
      bySlugs?: string[];
      excludingSlugs?: string[];
      inWorkflowStages?: number[];
      scheduledAtGt?: Date;
      scheduledAtLt?: Date;
      referenceSearch?: string | string[];
      withSummary?: boolean;
    } = {},
  ) {
    const {
      page = 1, perPage = 25, search, sortField = 'position', sortDir = 'asc',
      parentId, contentType, tag, block, published, uuid, storyId, inRelease,
      byIds, byUuids, byUuidsOrdered, excludingIds, favouriteOf, mine, folderOnly, storyOnly, startsWith,
      inTrash, withSlug, bySlugs, excludingSlugs, inWorkflowStages, scheduledAtGt, scheduledAtLt,
      referenceSearch, withSummary,
    } = opts;

    // When filtering by release, join story_releases and return release-specific content
    if (inRelease !== undefined) {
      return this.listStoriesInRelease(spaceId, inRelease, { page, perPage, search });
    }

    const s = search?.trim();

    const conditions: (SQL | undefined)[] = [
      eq(stories.spaceId, spaceId),
      inTrash ? isNotNull(stories.deletedAt) : isNull(stories.deletedAt),
      // text_search: name OR slug OR full_slug OR content (as text)
      s
        ? or(
            ilike(stories.name, `%${s}%`),
            ilike(stories.slug, `%${s}%`),
            ilike(stories.fullSlug, `%${s}%`),
            sql`${stories.content}::text ilike ${'%' + s + '%'}`,
          )
        : undefined,
      // parent_id filter only when no search
      s
        ? undefined
        : startsWith?.trim()
          ? undefined // starts_with overrides parent filter
          : parentId === undefined
            ? undefined
            : parentId === null
              ? isNull(stories.parentId)
              : eq(stories.parentId, parentId),
      contentType?.trim()
        ? (() => {
            const types = contentType.split(',').map((t) => t.trim()).filter(Boolean);
            return types.length === 1
              ? eq(stories.contentType, types[0])
              : inArray(stories.contentType, types);
          })()
        : undefined,
      tag?.trim()
        ? sql`${stories.tagList}::text ilike ${'%' + tag.trim() + '%'}`
        : undefined,
      block?.trim()
        ? sql`${stories.content}::text ilike ${'%"component":"' + block.trim() + '"%'}`
        : undefined,
      published !== undefined ? eq(stories.published, published) : undefined,
      uuid?.trim() ? eq(stories.uuid, uuid.trim()) : undefined,
      storyId !== undefined ? eq(stories.id, BigInt(storyId)) : undefined,
      byIds?.length ? inArray(stories.id, byIds) : undefined,
      byUuids?.length ? inArray(stories.uuid, byUuids) : undefined,
      byUuidsOrdered?.length ? inArray(stories.uuid, byUuidsOrdered) : undefined,
      excludingIds?.length ? notInArray(stories.id, excludingIds) : undefined,
      mine !== undefined
        ? sql`EXISTS (
            SELECT 1 FROM workflow_stage_changes wsc
            WHERE wsc.story_id = ${stories.id}
              AND wsc.user_id = ${mine}
              AND wsc.created_at = (
                SELECT MAX(wsc2.created_at) FROM workflow_stage_changes wsc2
                WHERE wsc2.story_id = ${stories.id}
              )
          )`
        : undefined,
      favouriteOf !== undefined
        ? sql`${stories.favouriteForUserIds}::jsonb @> ${JSON.stringify([favouriteOf])}::jsonb`
        : undefined,
      folderOnly ? eq(stories.isFolder, true) : undefined,
      storyOnly ? eq(stories.isFolder, false) : undefined,
      startsWith?.trim() ? ilike(stories.fullSlug, `${startsWith.trim()}%`) : undefined,
      withSlug?.trim() ? eq(stories.fullSlug, withSlug.trim()) : undefined,
      bySlugs?.length
        ? or(...bySlugs.map((sl) => ilike(stories.fullSlug, sl.replace(/\*/g, '%'))))
        : undefined,
      excludingSlugs?.length
        ? and(...excludingSlugs.map((sl) => sql`${stories.fullSlug} not ilike ${sl.replace(/\*/g, '%')}`))
        : undefined,
      inWorkflowStages?.length
        ? sql`EXISTS (
            SELECT 1 FROM workflow_stage_changes wsc
            WHERE wsc.story_id = ${stories.id}
              AND wsc.workflow_stage_id = ANY(ARRAY[${sql.raw(inWorkflowStages.join(','))}])
              AND wsc.created_at = (
                SELECT MAX(wsc2.created_at) FROM workflow_stage_changes wsc2
                WHERE wsc2.story_id = ${stories.id}
              )
          )`
        : undefined,
      scheduledAtGt ? gt(stories.publishAt, scheduledAtGt) : undefined,
      scheduledAtLt ? lt(stories.publishAt, scheduledAtLt) : undefined,
      (() => {
        if (!referenceSearch) return undefined;
        const refs = Array.isArray(referenceSearch) ? referenceSearch : [referenceSearch];
        if (refs.length === 0) return undefined;
        return or(...refs.map((f) => sql`${stories.content}::text ilike ${'%' + f + '%'}`));
      })(),
    ];

    const where = and(...conditions);

    const [{ total }] = await this.db.select({ total: count() }).from(stories).where(where);

    const orderCol =
      sortField === 'name'
        ? stories.name
        : sortField === 'created_at'
          ? stories.createdAt
          : sortField === 'first_published_at'
            ? stories.firstPublishedAt
            : sortField === 'published_at'
              ? stories.publishedAt
              : sortField === 'updated_at'
                ? stories.updatedAt
                : sortField === 'slug'
                  ? stories.slug
                  : stories.position;

    const order = sortDir === 'desc' ? desc(orderCol) : asc(orderCol);

    const rows = await this.db
      .select()
      .from(stories)
      .where(where)
      .orderBy(order)
      .limit(perPage)
      .offset((page - 1) * perPage);

    // by_uuids_ordered: preserve input order
    let formattedStories = rows.map((s) => this.formatStory(s, withSummary));
    if (byUuidsOrdered?.length) {
      const orderMap = new Map(byUuidsOrdered.map((uuid, idx) => [uuid, idx]));
      formattedStories.sort((a, b) => (orderMap.get(a.uuid) ?? 999) - (orderMap.get(b.uuid) ?? 999));
    }

    return {
      stories: formattedStories,
      total: Number(total),
    };
  }

  private async listStoriesInRelease(
    spaceId: number,
    releaseId: number,
    opts: { page: number; perPage: number; search?: string },
  ) {
    const { page, perPage, search } = opts;

    // Filter by release_ids JSONB array — no join needed, story_releases snapshots
    // are only created when a story is actually edited in release context.
    const conditions: (SQL | undefined)[] = [
      eq(stories.spaceId, spaceId),
      isNull(stories.deletedAt),
      sql`${stories.releaseIds} @> ${JSON.stringify([releaseId])}::jsonb`,
      search?.trim() ? ilike(stories.name, `%${search.trim()}%`) : undefined,
    ];
    const where = and(...conditions);

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(stories)
      .where(where);

    const rows = await this.db
      .select()
      .from(stories)
      .where(where)
      .orderBy(asc(stories.position))
      .limit(perPage)
      .offset((page - 1) * perPage);

    return {
      stories: rows.map((s) => this.formatStory(s)),
      total: Number(total),
    };
  }

  async getFilterOptions(spaceId: number) {
    const [contentTypeRows, tagRows, componentRows] = await Promise.all([
      this.db
        .selectDistinct({ value: stories.contentType })
        .from(stories)
        .where(and(eq(stories.spaceId, spaceId), isNull(stories.deletedAt), isNotNull(stories.contentType)))
        .orderBy(asc(stories.contentType)),
      this.db
        .select({ name: tags.name })
        .from(tags)
        .where(eq(tags.spaceId, spaceId))
        .orderBy(asc(tags.name)),
      this.db
        .select({ name: components.name, displayName: components.displayName })
        .from(components)
        .where(eq(components.spaceId, spaceId))
        .orderBy(asc(components.name)),
    ]);

    return {
      content_types: contentTypeRows.map((r) => r.value).filter(Boolean) as string[],
      tags: tagRows.map((r) => r.name),
      blocks: componentRows.map((r) => ({ value: r.name, label: r.displayName || r.name })),
    };
  }

  async getAncestors(spaceId: number, storyId: bigint) {
    const ancestors: ReturnType<typeof this.formatStory>[] = [];
    let currentId: bigint | null = storyId;
    const visited = new Set<string>();

    while (currentId !== null) {
      const key = currentId.toString();
      if (visited.has(key)) break;
      visited.add(key);

      const [row] = await this.db
        .select()
        .from(stories)
        .where(and(eq(stories.id, currentId), eq(stories.spaceId, spaceId)))
        .limit(1);

      if (!row) break;
      ancestors.unshift(this.formatStory(row));
      currentId = row.parentId;
    }

    return { ancestors };
  }

  async getStoryAdmin(spaceId: number, storyId: number, releaseId?: number) {
    const [story] = await this.db
      .select()
      .from(stories)
      .where(and(eq(stories.id, BigInt(storyId)), eq(stories.spaceId, spaceId), isNull(stories.deletedAt)))
      .limit(1);

    if (!story) throw new NotFoundException('Story not found');

    // Overlay release snapshot if requested
    let storyRow = story;
    if (releaseId != null) {
      const [snapshot] = await this.db
        .select({ content: storyReleases.content })
        .from(storyReleases)
        .where(and(eq(storyReleases.storyId, storyId), eq(storyReleases.releaseId, releaseId)))
        .limit(1);
      if (snapshot) {
        const d = snapshot.content as Record<string, any>;
        storyRow = {
          ...story,
          ...(d.name !== undefined && { name: d.name }),
          ...(d.slug !== undefined && { slug: d.slug }),
          ...(d.full_slug !== undefined && { fullSlug: d.full_slug }),
          ...(d.content !== undefined && { content: d.content }),
          ...(d.tag_list !== undefined && { tagList: d.tag_list }),
          ...('path' in d && { path: d.path }),
          ...(d.is_startpage !== undefined && { isStartpage: d.is_startpage }),
        };
      }
    }

    // Check parent folder's disable_fe_editor
    let parentDisableFEEditor = false;
    if (story.parentId) {
      const [parent] = await this.db
        .select({ disableFEEditor: stories.disableFEEditor })
        .from(stories)
        .where(and(eq(stories.id, story.parentId), eq(stories.spaceId, spaceId)))
        .limit(1);
      if (parent) parentDisableFEEditor = parent.disableFEEditor;
    }

    let componentSchema: Record<string, any> | null = null;
    if (story.contentType) {
      const [comp] = await this.db
        .select({ schema: components.schema })
        .from(components)
        .where(and(eq(components.spaceId, spaceId), eq(components.name, story.contentType)))
        .limit(1);
      if (comp) componentSchema = comp.schema as Record<string, any>;
    }

    const [allComponents, allGroups] = await Promise.all([
      this.db
        .select({
          name: components.name,
          displayName: components.displayName,
          schema: components.schema,
          previewField: components.previewField,
          previewTmpl: components.previewTmpl,
          color: components.color,
          icon: components.icon,
          description: components.description,
          componentGroupUuid: components.componentGroupUuid,
        })
        .from(components)
        .where(eq(components.spaceId, spaceId))
        .orderBy(asc(components.name)),
      this.db
        .select({ uuid: componentGroups.uuid, name: componentGroups.name })
        .from(componentGroups)
        .where(eq(componentGroups.spaceId, spaceId))
        .orderBy(asc(componentGroups.name)),
    ]);

    return {
      story: this.formatStoryWithContent(storyRow),
      component_schema: componentSchema,
      parent_disable_fe_editor: parentDisableFEEditor,
      all_components: allComponents.map((c) => ({
        name: c.name,
        display_name: c.displayName,
        schema: c.schema as Record<string, any>,
        preview_field: c.previewField ?? null,
        preview_tmpl: c.previewTmpl ?? null,
        color: c.color ?? null,
        icon: c.icon ?? null,
        description: c.description ?? null,
        component_group_uuid: c.componentGroupUuid ?? null,
        edit_mode: null,
      })),
      all_groups: allGroups.map((g) => ({ uuid: g.uuid, name: g.name })),
    };
  }

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
    // If release_id is provided, save as release snapshot instead of main content
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
    if ('sort_by_date' in data) updateData.sortByDate = data.sort_by_date ? new Date(data.sort_by_date) : null;
    if ('path' in data) updateData.path = data.path;
    if ('first_published_at' in data)
      updateData.firstPublishedAt = data.first_published_at ? new Date(data.first_published_at) : null;
    if ('publish_at' in data) updateData.publishAt = data.publish_at ? new Date(data.publish_at) : null;
    if ('expire_at' in data) updateData.expireAt = data.expire_at ? new Date(data.expire_at) : null;
    if ('is_startpage' in data) updateData.isStartpage = data.is_startpage;
    if ('disable_fe_editor' in data) updateData.disableFEEditor = data.disable_fe_editor;

    // Recompute fullSlug when is_startpage or slug changes
    if ('is_startpage' in data || data.slug !== undefined) {
      const [current] = await this.db
        .select({ slug: stories.slug, parentId: stories.parentId, isStartpage: stories.isStartpage })
        .from(stories)
        .where(and(eq(stories.id, BigInt(storyId)), eq(stories.spaceId, spaceId)))
        .limit(1);
      if (current) {
        const effectiveSlug = data.slug ?? current.slug;
        const effectiveIsStartpage = 'is_startpage' in data ? data.is_startpage : current.isStartpage;
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
      .where(and(eq(stories.id, BigInt(storyId)), eq(stories.spaceId, spaceId), isNull(stories.deletedAt)));

    // Schedule/cancel delayed jobs when publish_at or expire_at changes
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

    const result = await this.getStoryAdmin(spaceId, storyId);
    const s = result.story as Record<string, any>;

    if (data.slug !== undefined) {
      // Slug changed → story.moved
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

    this.logVersion({
      storyId, spaceId, userId: authorId, action: 'save', status: 'draft',
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
        id: stories.id, name: stories.name, slug: stories.slug,
        fullSlug: stories.fullSlug, content: stories.content,
        tagList: stories.tagList, path: stories.path,
        isStartpage: stories.isStartpage, parentId: stories.parentId,
        releaseIds: stories.releaseIds,
      })
      .from(stories)
      .where(and(eq(stories.id, BigInt(storyId)), eq(stories.spaceId, spaceId), isNull(stories.deletedAt)))
      .limit(1);
    if (!story) throw new NotFoundException('Story not found');

    // Fetch existing snapshot to merge with
    const [existing] = await this.db
      .select({ content: storyReleases.content })
      .from(storyReleases)
      .where(and(eq(storyReleases.storyId, storyId), eq(storyReleases.releaseId, releaseId)))
      .limit(1);

    const existingData = (existing?.content ?? {}) as Record<string, any>;
    const now = new Date();
    const existingIds = (story.releaseIds as number[]) ?? [];

    const effectiveSlug = changes.slug ?? existingData.slug ?? story.slug;
    const effectiveIsStartpage = changes.is_startpage ?? existingData.is_startpage ?? story.isStartpage;

    // Recompute full_slug if slug or is_startpage changed
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

    // Build merged snapshot: base story → existing snapshot → new changes
    const snapshot = {
      name: changes.name ?? existingData.name ?? story.name,
      slug: effectiveSlug,
      full_slug: effectiveFullSlug,
      content: changes.content ?? existingData.content ?? story.content,
      tag_list: changes.tag_list ?? existingData.tag_list ?? story.tagList,
      path: 'path' in changes ? changes.path : (existingData.path ?? story.path),
      is_startpage: effectiveIsStartpage,
    };

    await this.db
      .insert(storyReleases)
      .values({ storyId, releaseId, content: snapshot, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: [storyReleases.storyId, storyReleases.releaseId],
        set: { content: snapshot, updatedAt: now },
      });

    if (!existingIds.includes(releaseId)) {
      await this.db
        .update(stories)
        .set({ releaseIds: [...existingIds, releaseId], updatedAt: now })
        .where(eq(stories.id, BigInt(storyId)));
    }

    this.logVersion({
      storyId, spaceId, releaseId, action: 'save', status: 'draft',
      name: snapshot.name, slug: snapshot.slug, fullSlug: snapshot.full_slug,
      content: (snapshot.content ?? {}) as Record<string, any>,
      tagList: snapshot.tag_list ?? [],
      path: snapshot.path, isStartpage: snapshot.is_startpage,
    });

    return this.getStoryAdmin(spaceId, storyId);
  }

  async publishStory(spaceId: number, storyId: number, userId?: number | null, _lang?: string) {
    const [current] = await this.db
      .select({
        firstPublishedAt: stories.firstPublishedAt, name: stories.name, fullSlug: stories.fullSlug,
        slug: stories.slug, content: stories.content, tagList: stories.tagList,
        path: stories.path, isStartpage: stories.isStartpage,
      })
      .from(stories)
      .where(and(eq(stories.id, BigInt(storyId)), eq(stories.spaceId, spaceId)))
      .limit(1);

    const now = new Date();
    const publishedData = current ? {
      name: current.name,
      slug: current.slug,
      full_slug: current.fullSlug,
      content: current.content,
      tag_list: current.tagList,
      path: current.path,
      is_startpage: current.isStartpage,
    } : null;

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
      .where(and(eq(stories.id, BigInt(storyId)), eq(stories.spaceId, spaceId), isNull(stories.deletedAt)));

    void this.webhooks.dispatch(spaceId, WEBHOOK_ACTIONS.STORY_PUBLISHED, {
      action: 'published',
      space_id: spaceId,
      story_id: storyId,
      full_slug: current?.fullSlug ?? '',
      text: `Story "${current?.name ?? storyId}" was published.`,
    });

    if (current) {
      this.logVersion({
        storyId, spaceId, userId, action: 'publish', status: 'published',
        name: current.name, slug: current.slug, fullSlug: current.fullSlug,
        content: (current.content ?? {}) as Record<string, any>,
        tagList: current.tagList ?? [],
        path: current.path, isStartpage: current.isStartpage,
      });
    }

    return this.getStoryAdmin(spaceId, storyId);
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
      .where(and(eq(stories.id, BigInt(storyId)), eq(stories.spaceId, spaceId), isNull(stories.deletedAt)));

    void this.webhooks.dispatch(spaceId, WEBHOOK_ACTIONS.STORY_UNPUBLISHED, {
      action: 'unpublished',
      space_id: spaceId,
      story_id: storyId,
      full_slug: current?.fullSlug ?? '',
      text: `Story "${current?.name ?? storyId}" was unpublished.`,
    });

    if (current) {
      this.logVersion({
        storyId, spaceId, userId, action: 'unpublish', status: 'unpublished',
        name: current.name, slug: '', fullSlug: current.fullSlug,
        content: {}, tagList: [],
      });
    }

    return this.getStoryAdmin(spaceId, storyId);
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

    await this.db.insert(stories).values({
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

    // Associate with release if release_id provided
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
      await this.db
        .insert(storyReleases)
        .values({ storyId: Number(id), releaseId, content: snapshot, createdAt: now, updatedAt: now });
      await this.db
        .update(stories)
        .set({ releaseIds: [releaseId] })
        .where(eq(stories.id, id));
    }

    void this.webhooks.dispatch(spaceId, 'story.created', {
      action: 'created',
      space_id: spaceId,
      story_id: Number(id),
      full_slug: fullSlug,
      text: `Story "${data.name}" was created.`,
    });

    // Schedule delayed jobs when publish_at or expire_at is set at creation
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

    this.logVersion({
      storyId: Number(id), spaceId, userId: authorId, action: 'create', status: 'draft',
      name: data.name, slug: data.slug, fullSlug,
      content: data.content ?? {}, tagList: data.tag_list ?? [],
      path: data.path, isStartpage: data.is_startpage,
    });

    return this.getStoryAdmin(spaceId, Number(id));
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

      return { story: this.formatStory(deleted) };
    }

    return { story: {} };
  }

  private formatStoryWithContent(s: typeof stories.$inferSelect): Record<string, any> {
    return {
      ...this.formatStory(s),
      content: s.content as Record<string, any>,
      tag_list: s.tagList as string[],
      sort_by_date: s.sortByDate,
    };
  }

  private formatStory(s: typeof stories.$inferSelect, withSummary = false): Record<string, any> {
    const base: Record<string, any> = {
      id: Number(s.id),
      uuid: s.uuid,
      name: s.name,
      slug: s.slug,
      full_slug: s.fullSlug,
      path: s.path,
      parent_id: s.parentId ? Number(s.parentId) : null,
      content_type: s.contentType,
      is_folder: s.isFolder,
      is_startpage: s.isStartpage,
      published: s.published,
      unpublished_changes: s.unpublishedChanges,
      position: s.position,
      created_at: s.createdAt,
      updated_at: s.updatedAt,
      published_at: s.publishedAt,
      first_published_at: s.firstPublishedAt,
      publish_at: s.publishAt,
      expire_at: s.expireAt,
      last_author_id: s.lastAuthorId,
      release_ids: (s.releaseIds as number[]) ?? [],
      favourite_for_user_ids: (s.favouriteForUserIds as number[]) ?? [],
      disable_fe_editor: s.disableFEEditor ?? false,
    };

    if (withSummary && s.content) {
      // Build a shallow summary of the content (component name + top-level keys)
      const content = s.content as Record<string, any>;
      const summary: Record<string, any> = {};
      if (content.component) summary.component = content.component;
      if (content._uid) summary._uid = content._uid;
      base.content_summary = summary;
    }

    return base;
  }

  async partialUpdateStory(spaceId: number, storyId: number, updates: { favourite_for_user_ids?: number[] }) {
    const [story] = await this.db
      .select()
      .from(stories)
      .where(and(eq(stories.id, BigInt(storyId)), eq(stories.spaceId, spaceId), isNull(stories.deletedAt)))
      .limit(1);
    if (!story) throw new NotFoundException('Story not found');

    if (updates.favourite_for_user_ids === undefined) {
      return { story: this.formatStory(story) };
    }

    const [updated] = await this.db
      .update(stories)
      .set({ favouriteForUserIds: updates.favourite_for_user_ids })
      .where(eq(stories.id, BigInt(storyId)))
      .returning();

    return { story: this.formatStory(updated) };
  }
}
