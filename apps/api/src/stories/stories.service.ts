import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SQL, and, asc, count, desc, eq, ilike, isNull, isNotNull, sql, inArray } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { stories, tags, components, componentGroups } from '../db/schema';

@Injectable()
export class StoriesService {
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
    } = {},
  ) {
    const {
      page = 1, perPage = 25, search, sortField = 'position', sortDir = 'asc',
      parentId, contentType, tag, block, published, uuid, storyId,
    } = opts;

    const conditions: (SQL | undefined)[] = [
      eq(stories.spaceId, spaceId),
      isNull(stories.deletedAt),
      search?.trim() ? ilike(stories.name, `%${search.trim()}%`) : undefined,
      parentId === undefined
        ? undefined
        : parentId === null
          ? isNull(stories.parentId)
          : eq(stories.parentId, parentId),
      contentType?.trim() ? ilike(stories.contentType, `%${contentType.trim()}%`) : undefined,
      tag?.trim()
        ? sql`${stories.tagList}::text ilike ${'%' + tag.trim() + '%'}`
        : undefined,
      block?.trim()
        ? sql`${stories.content}::text ilike ${'%"component":"' + block.trim() + '"%'}`
        : undefined,
      published !== undefined ? eq(stories.published, published) : undefined,
      uuid?.trim() ? eq(stories.uuid, uuid.trim()) : undefined,
      storyId !== undefined ? eq(stories.id, BigInt(storyId)) : undefined,
    ];

    const where = and(...conditions);

    const [{ total }] = await this.db.select({ total: count() }).from(stories).where(where);

    const orderCol =
      sortField === 'created_at'
        ? stories.createdAt
        : sortField === 'first_published_at'
          ? stories.firstPublishedAt
          : sortField === 'published_at'
            ? stories.publishedAt
            : sortField === 'updated_at'
              ? stories.updatedAt
              : stories.position;

    const order = sortDir === 'desc' ? desc(orderCol) : asc(orderCol);

    const rows = await this.db
      .select()
      .from(stories)
      .where(where)
      .orderBy(order)
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

  async getStoryAdmin(spaceId: number, storyId: number) {
    const [story] = await this.db
      .select()
      .from(stories)
      .where(and(eq(stories.id, BigInt(storyId)), eq(stories.spaceId, spaceId), isNull(stories.deletedAt)))
      .limit(1);

    if (!story) throw new NotFoundException('Story not found');

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
      story: this.formatStoryWithContent(story),
      component_schema: componentSchema,
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
    },
  ) {
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
      unpublishedChanges: true,
    };

    if (data.content !== undefined) updateData.content = data.content;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.tag_list !== undefined) updateData.tagList = data.tag_list;
    if ('sort_by_date' in data) updateData.sortByDate = data.sort_by_date ? new Date(data.sort_by_date) : null;
    if ('path' in data) updateData.path = data.path;
    if ('first_published_at' in data)
      updateData.firstPublishedAt = data.first_published_at ? new Date(data.first_published_at) : null;

    await this.db
      .update(stories)
      .set(updateData)
      .where(and(eq(stories.id, BigInt(storyId)), eq(stories.spaceId, spaceId), isNull(stories.deletedAt)));

    return this.getStoryAdmin(spaceId, storyId);
  }

  async publishStory(spaceId: number, storyId: number) {
    const [current] = await this.db
      .select({ firstPublishedAt: stories.firstPublishedAt })
      .from(stories)
      .where(and(eq(stories.id, BigInt(storyId)), eq(stories.spaceId, spaceId)))
      .limit(1);

    const now = new Date();
    await this.db
      .update(stories)
      .set({
        published: true,
        unpublishedChanges: false,
        publishedAt: now,
        firstPublishedAt: current?.firstPublishedAt ?? now,
        updatedAt: now,
      })
      .where(and(eq(stories.id, BigInt(storyId)), eq(stories.spaceId, spaceId), isNull(stories.deletedAt)));

    return this.getStoryAdmin(spaceId, storyId);
  }

  async unpublishStory(spaceId: number, storyId: number) {
    await this.db
      .update(stories)
      .set({ published: false, unpublishedChanges: true, updatedAt: new Date() })
      .where(and(eq(stories.id, BigInt(storyId)), eq(stories.spaceId, spaceId), isNull(stories.deletedAt)));

    return this.getStoryAdmin(spaceId, storyId);
  }

  private formatStoryWithContent(s: typeof stories.$inferSelect) {
    return {
      ...this.formatStory(s),
      content: s.content as Record<string, any>,
      tag_list: s.tagList as string[],
      sort_by_date: s.sortByDate,
      first_published_at: s.firstPublishedAt,
      publish_at: s.publishAt,
      expire_at: s.expireAt,
    };
  }

  private formatStory(s: typeof stories.$inferSelect) {
    return {
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
      last_author_id: s.lastAuthorId,
    };
  }
}
