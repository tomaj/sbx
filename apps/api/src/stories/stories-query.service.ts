import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  SQL,
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  ilike,
  isNull,
  isNotNull,
  lt,
  notInArray,
  or,
  sql,
  inArray,
} from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import {
  stories,
  tags,
  components,
  componentGroups,
  storyReleases,
} from '../db/schema';

@Injectable()
export class StoriesQueryService {
  constructor(@Inject(DB) private db: DbType) {}

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
      page = 1,
      perPage = 25,
      search,
      sortField = 'position',
      sortDir = 'asc',
      parentId,
      contentType,
      tag,
      block,
      published,
      uuid,
      storyId,
      inRelease,
      byIds,
      byUuids,
      byUuidsOrdered,
      excludingIds,
      favouriteOf,
      mine,
      folderOnly,
      storyOnly,
      startsWith,
      inTrash,
      withSlug,
      bySlugs,
      excludingSlugs,
      inWorkflowStages,
      scheduledAtGt,
      scheduledAtLt,
      referenceSearch,
      withSummary,
    } = opts;

    // When filtering by release, join story_releases and return release-specific content
    if (inRelease !== undefined) {
      return this.listStoriesInRelease(spaceId, inRelease, {
        page,
        perPage,
        search,
      });
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
            const types = contentType
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean);
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
      byUuidsOrdered?.length
        ? inArray(stories.uuid, byUuidsOrdered)
        : undefined,
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
      startsWith?.trim()
        ? ilike(stories.fullSlug, `${startsWith.trim()}%`)
        : undefined,
      withSlug?.trim() ? eq(stories.fullSlug, withSlug.trim()) : undefined,
      bySlugs?.length
        ? or(
            ...bySlugs.map((sl) =>
              ilike(stories.fullSlug, sl.replace(/\*/g, '%')),
            ),
          )
        : undefined,
      excludingSlugs?.length
        ? and(
            ...excludingSlugs.map(
              (sl) =>
                sql`${stories.fullSlug} not ilike ${sl.replace(/\*/g, '%')}`,
            ),
          )
        : undefined,
      inWorkflowStages?.length
        ? sql`EXISTS (
            SELECT 1 FROM workflow_stage_changes wsc
            WHERE wsc.story_id = ${stories.id}
              AND wsc.workflow_stage_id = ANY(${inWorkflowStages})
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
        const refs = Array.isArray(referenceSearch)
          ? referenceSearch
          : [referenceSearch];
        if (refs.length === 0) return undefined;
        return or(
          ...refs.map(
            (f) => sql`${stories.content}::text ilike ${'%' + f + '%'}`,
          ),
        );
      })(),
    ];

    const where = and(...conditions);

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(stories)
      .where(where);

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
      const orderMap = new Map(
        byUuidsOrdered.map((uuid, idx) => [uuid, idx]),
      );
      formattedStories.sort(
        (a, b) =>
          (orderMap.get(a.uuid) ?? 999) - (orderMap.get(b.uuid) ?? 999),
      );
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
        .where(
          and(
            eq(stories.spaceId, spaceId),
            isNull(stories.deletedAt),
            isNotNull(stories.contentType),
          ),
        )
        .orderBy(asc(stories.contentType)),
      this.db
        .select({ name: tags.name })
        .from(tags)
        .where(eq(tags.spaceId, spaceId))
        .orderBy(asc(tags.name)),
      this.db
        .select({
          name: components.name,
          displayName: components.displayName,
        })
        .from(components)
        .where(eq(components.spaceId, spaceId))
        .orderBy(asc(components.name)),
    ]);

    return {
      content_types: contentTypeRows
        .map((r) => r.value)
        .filter(Boolean) as string[],
      tags: tagRows.map((r) => r.name),
      blocks: componentRows.map((r) => ({
        value: r.name,
        label: r.displayName || r.name,
      })),
    };
  }

  async getAncestors(spaceId: number, storyId: bigint) {
    // Fetch ancestor IDs (including self) with a recursive CTE in a single query
    const idRows = await this.db.execute<{ id: string; depth: number }>(sql`
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_id, 0 AS depth
        FROM stories
        WHERE id = ${storyId} AND space_id = ${spaceId}
        UNION ALL
        SELECT s.id, s.parent_id, a.depth + 1
        FROM stories s
        INNER JOIN ancestors a ON s.id = a.parent_id
        WHERE s.space_id = ${spaceId}
      )
      SELECT id, depth FROM ancestors ORDER BY depth DESC
    `);

    if (idRows.rows.length === 0) {
      return { ancestors: [] };
    }

    const ancestorIds = idRows.rows.map((r: { id: string; depth: number }) => BigInt(r.id));

    // Fetch full story rows via Drizzle ORM for proper type mapping
    const rows = await this.db
      .select()
      .from(stories)
      .where(
        and(eq(stories.spaceId, spaceId), inArray(stories.id, ancestorIds)),
      );

    // Reorder rows to match CTE depth order (root first)
    const rowMap = new Map(rows.map((r) => [r.id.toString(), r]));
    const ordered = ancestorIds
      .map((id: bigint) => rowMap.get(id.toString()))
      .filter((r): r is typeof stories.$inferSelect => r != null);

    return { ancestors: ordered.map((r: typeof stories.$inferSelect) => this.formatStory(r)) };
  }

  async getStoryAdmin(spaceId: number, storyId: number, releaseId?: number) {
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

    // Overlay release snapshot if requested
    let storyRow = story;
    if (releaseId != null) {
      const [snapshot] = await this.db
        .select({ content: storyReleases.content })
        .from(storyReleases)
        .where(
          and(
            eq(storyReleases.storyId, storyId),
            eq(storyReleases.releaseId, releaseId),
          ),
        )
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
        .where(
          and(eq(stories.id, story.parentId), eq(stories.spaceId, spaceId)),
        )
        .limit(1);
      if (parent) parentDisableFEEditor = parent.disableFEEditor;
    }

    let componentSchema: Record<string, any> | null = null;
    if (story.contentType) {
      const [comp] = await this.db
        .select({ schema: components.schema })
        .from(components)
        .where(
          and(
            eq(components.spaceId, spaceId),
            eq(components.name, story.contentType),
          ),
        )
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
        .select({
          uuid: componentGroups.uuid,
          name: componentGroups.name,
        })
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

  formatStoryWithContent(
    s: typeof stories.$inferSelect,
  ): Record<string, any> {
    return {
      ...this.formatStory(s),
      content: s.content as Record<string, any>,
      tag_list: s.tagList as string[],
      sort_by_date: s.sortByDate,
    };
  }

  formatStory(
    s: typeof stories.$inferSelect,
    withSummary = false,
  ): Record<string, any> {
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
      const content = s.content as Record<string, any>;
      const summary: Record<string, any> = {};
      if (content.component) summary.component = content.component;
      if (content._uid) summary._uid = content._uid;
      base.content_summary = summary;
    }

    return base;
  }
}
