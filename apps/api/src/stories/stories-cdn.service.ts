import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ResultGuard } from '../shared/result-guard.util';
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import { escapeLike } from '../shared/query-parser.util';
import { DB } from '../db/db.module';
import { DbType } from '../db/db.module';
import { spaces, stories, storyReleases } from '../db/schema';

@Injectable()
export class StoriesCdnService {
  constructor(@Inject(DB) private db: DbType) {}

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private formatStory(
    s: typeof stories.$inferSelect,
    version: 'published' | 'draft' = 'published',
    excludingFields?: string[],
    languageCodes: string[] = [],
    snapshotOverride?: Record<string, any> | null,
  ) {
    // Determine which data to use: snapshot override (from_release) > published_data (version=published) > draft fields
    let effectiveName = s.name;
    let effectiveSlug = s.slug;
    let effectiveFullSlug = s.fullSlug;
    let effectiveContent = s.content as any;
    let effectiveTagList = s.tagList as string[];
    let effectivePath = s.path;
    let effectiveIsStartpage = s.isStartpage;

    if (snapshotOverride) {
      effectiveName = snapshotOverride.name ?? s.name;
      effectiveSlug = snapshotOverride.slug ?? s.slug;
      effectiveFullSlug = snapshotOverride.full_slug ?? s.fullSlug;
      effectiveContent = snapshotOverride.content ?? s.content;
      effectiveTagList = snapshotOverride.tag_list ?? s.tagList;
      effectivePath = snapshotOverride.path ?? s.path;
      effectiveIsStartpage = snapshotOverride.is_startpage ?? s.isStartpage;
    } else if (version === 'published' && s.publishedData) {
      const pd = s.publishedData as Record<string, any>;
      effectiveName = pd.name ?? s.name;
      effectiveSlug = pd.slug ?? s.slug;
      effectiveFullSlug = pd.full_slug ?? s.fullSlug;
      effectiveContent = pd.content ?? s.content;
      effectiveTagList = pd.tag_list ?? s.tagList;
      effectivePath = pd.path ?? s.path;
      effectiveIsStartpage = pd.is_startpage ?? s.isStartpage;
    }

    const formattedContent =
      version === 'draft'
        ? this.addEditableMetadata(effectiveContent, s.spaceId!, Number(s.id))
        : this.stripEditableMetadata(effectiveContent);

    // Field order matches Storyblok CDN API exactly
    const story: Record<string, any> = {
      name: effectiveName,
      created_at: s.createdAt.toISOString(),
      published_at: s.publishedAt?.toISOString() ?? null,
      updated_at: s.updatedAt.toISOString(),
      id: Number(s.id),
      uuid: s.uuid,
      content: formattedContent,
      slug: effectiveSlug,
      full_slug: effectiveFullSlug,
      sort_by_date: s.sortByDate ? s.sortByDate.toISOString() : null,
      position: s.position,
      tag_list: effectiveTagList,
      is_startpage: effectiveIsStartpage,
      parent_id: s.parentId ? Number(s.parentId) : null,
      meta_data: null,
      group_id: s.groupId,
      first_published_at: s.firstPublishedAt?.toISOString() ?? null,
      release_id: null,
      lang: 'default',
      path: effectivePath ?? '',
      alternates: [],
      default_full_slug: s.defaultFullSlug ?? (languageCodes.length > 0 ? effectiveFullSlug : null),
      translated_slugs:
        s.translatedSlugs ??
        (languageCodes.length > 0
          ? languageCodes.map((lang) => ({
              path: effectiveFullSlug,
              name: null,
              lang,
              published: null,
            }))
          : null),
    };

    if (excludingFields && excludingFields.length > 0) {
      for (const field of excludingFields) {
        delete story[field.trim()];
      }
    }

    return story;
  }

  private stripEditableMetadata(content: any): any {
    if (!content || typeof content !== 'object') return content;
    if (Array.isArray(content)) return content.map((item) => this.stripEditableMetadata(item));
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(content)) {
      if (key === '_editable') continue;
      result[key] = typeof val === 'object' && val !== null ? this.stripEditableMetadata(val) : val;
    }
    return result;
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

  // ── Filter query builder ──────────────────────────────────────────────────

  private buildContentFilter(filterQuery: Record<string, any>): (SQL | undefined)[] {
    const conditions: (SQL | undefined)[] = [];

    for (const [field, ops] of Object.entries(filterQuery)) {
      if (field === '__or' && Array.isArray(ops)) {
        const orParts: SQL[] = [];
        for (const orEntry of ops) {
          if (orEntry && typeof orEntry === 'object') {
            const sub = this.buildContentFilter(orEntry);
            orParts.push(...(sub.filter(Boolean) as SQL[]));
          }
        }
        if (orParts.length > 0) {
          conditions.push(or(...orParts));
        }
        continue;
      }

      if (!ops || typeof ops !== 'object' || Array.isArray(ops)) continue;
      if (!/^[\w.]+$/.test(field)) continue;

      for (const [op, val] of Object.entries(ops)) {
        const cond = this.buildFieldFilter(field, op, String(val));
        if (cond) conditions.push(cond);
      }
    }

    return conditions;
  }

  // Build a SQL fragment for JSONB text extraction (parameterized — no sql.raw)
  private jsonbText(field: string): SQL {
    const parts = field.split('.');
    for (const p of parts) {
      if (!/^\w+$/.test(p)) {
        throw new BadRequestException(`Invalid field name: ${field}`);
      }
    }
    if (parts.length === 1) {
      return sql`content->>${parts[0]}`;
    }
    let acc: SQL = sql`content`;
    for (let i = 0; i < parts.length - 1; i++) {
      acc = sql`${acc}->${parts[i]}`;
    }
    return sql`${acc}->>${parts[parts.length - 1]}`;
  }

  private jsonbJson(field: string): SQL {
    const parts = field.split('.');
    for (const p of parts) {
      if (!/^\w+$/.test(p)) {
        throw new BadRequestException(`Invalid field name: ${field}`);
      }
    }
    let acc: SQL = sql`content`;
    for (const p of parts) {
      acc = sql`${acc}->${p}`;
    }
    return acc;
  }

  private buildFieldFilter(field: string, op: string, value: string): SQL | undefined {
    const txt = this.jsonbText(field);
    const jsn = this.jsonbJson(field);

    switch (op) {
      case 'in': {
        const vals = value
          .split(',')
          .slice(0, 1000)
          .map((v) => v.trim())
          .filter(Boolean);
        if (!vals.length) return undefined;
        return or(...vals.map((v) => sql`(${txt}) = ${v}`));
      }
      case 'not_in': {
        const vals = value
          .split(',')
          .slice(0, 1000)
          .map((v) => v.trim())
          .filter(Boolean);
        if (!vals.length) return undefined;
        // Include rows where field is NULL or doesn't match any value
        return and(...vals.map((v) => sql`((${txt}) IS NULL OR (${txt}) != ${v})`));
      }
      case 'like': {
        const pattern = value.replace(/\*/g, '%');
        return sql`(${txt}) ILIKE ${pattern}`;
      }
      case 'not_like': {
        const pattern = value.replace(/\*/g, '%');
        return sql`((${txt}) IS NULL OR (${txt}) NOT ILIKE ${pattern})`;
      }
      case 'is': {
        switch (value) {
          case 'empty':
            return sql`((${txt}) IS NULL OR (${txt}) = '')`;
          case 'not_empty':
            return sql`((${txt}) IS NOT NULL AND (${txt}) != '')`;
          case 'empty_array':
            return sql`CAST(${jsn} AS text) = '[]'`;
          case 'not_empty_array':
            return sql`((${jsn}) IS NOT NULL AND CAST(${jsn} AS text) != '[]')`;
          case 'true':
            return sql`(${txt}) = 'true'`;
          case 'false':
            return sql`(${txt}) = 'false'`;
          case 'null':
            return sql`(${txt}) IS NULL`;
          case 'not_null':
            return sql`(${txt}) IS NOT NULL`;
          default:
            return undefined;
        }
      }
      case 'any_in_array': {
        const vals = value
          .split(',')
          .slice(0, 1000)
          .map((v) => v.trim())
          .filter(Boolean);
        if (!vals.length) return undefined;
        return or(...vals.map((v) => sql`(${jsn}) ? ${v}`));
      }
      case 'all_in_array': {
        const vals = value
          .split(',')
          .slice(0, 1000)
          .map((v) => v.trim())
          .filter(Boolean);
        if (!vals.length) return undefined;
        return and(...vals.map((v) => sql`(${jsn}) ? ${v}`));
      }
      case 'gt_int': {
        const n = parseInt(value, 10);
        if (Number.isNaN(n)) return undefined;
        return sql`(CAST(${txt} AS integer) > ${n})`;
      }
      case 'lt_int': {
        const n = parseInt(value, 10);
        if (Number.isNaN(n)) return undefined;
        return sql`(CAST(${txt} AS integer) < ${n})`;
      }
      case 'gt_float': {
        const n = parseFloat(value);
        if (Number.isNaN(n)) return undefined;
        return sql`(CAST(${txt} AS float) > ${n})`;
      }
      case 'lt_float': {
        const n = parseFloat(value);
        if (Number.isNaN(n)) return undefined;
        return sql`(CAST(${txt} AS float) < ${n})`;
      }
      case 'gt_date': {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return undefined;
        return sql`(CAST(${txt} AS timestamp) > ${d})`;
      }
      case 'lt_date': {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return undefined;
        return sql`(CAST(${txt} AS timestamp) < ${d})`;
      }
      default:
        return undefined;
    }
  }

  // ── List stories ─────────────────────────────────────────────────────────────

  async listStories(
    spaceId: number,
    opts: {
      version?: 'published' | 'draft';
      fromRelease?: number;
      page?: number;
      perPage?: number;
      startsWith?: string;
      bySlugs?: string[];
      byUuids?: string[];
      byUuidsOrdered?: string[];
      excludingSlugs?: string[];
      excludingIds?: number[];
      contentType?: string;
      level?: number;
      withTag?: string;
      isStartpage?: boolean;
      searchTerm?: string;
      sortBy?: string;
      filterQuery?: Record<string, any>;
      firstPublishedAtGt?: string;
      firstPublishedAtLt?: string;
      publishedAtGt?: string;
      publishedAtLt?: string;
      updatedAtGt?: string;
      updatedAtLt?: string;
      excludingFields?: string[];
    } = {},
  ) {
    const {
      version = 'published',
      fromRelease,
      page = 1,
      perPage = 25,
      startsWith,
      bySlugs,
      byUuids,
      byUuidsOrdered,
      excludingSlugs,
      excludingIds,
      contentType,
      level,
      withTag,
      isStartpage,
      searchTerm,
      sortBy,
      filterQuery,
      firstPublishedAtGt,
      firstPublishedAtLt,
      publishedAtGt,
      publishedAtLt,
      updatedAtGt,
      updatedAtLt,
      excludingFields,
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

    // Slug prefix filter
    if (startsWith?.trim()) {
      conditions.push(ilike(stories.fullSlug, `${escapeLike(startsWith.trim())}%`));
    }

    // By slugs filter (supports * wildcards)
    if (bySlugs && bySlugs.length > 0) {
      const slugConditions = bySlugs.map((slug) => {
        const trimmed = slug.trim();
        if (trimmed.includes('*')) {
          return ilike(stories.fullSlug, trimmed.replace(/\*/g, '%'));
        }
        return eq(stories.fullSlug, trimmed);
      });
      conditions.push(or(...slugConditions));
    }

    // By UUIDs filter
    const uuids = byUuidsOrdered ?? byUuids;
    if (uuids && uuids.length > 0) {
      conditions.push(
        inArray(
          stories.uuid,
          uuids.map((u) => u.trim()),
        ),
      );
    }

    // Excluding slugs (supports * wildcards)
    if (excludingSlugs && excludingSlugs.length > 0) {
      for (const slug of excludingSlugs) {
        const trimmed = slug.trim();
        if (!trimmed) continue;
        if (trimmed.includes('*')) {
          conditions.push(sql`${stories.fullSlug} NOT ILIKE ${trimmed.replace(/\*/g, '%')}`);
        } else {
          conditions.push(sql`${stories.fullSlug} != ${trimmed}`);
        }
      }
    }

    // Excluding IDs
    if (excludingIds && excludingIds.length > 0) {
      conditions.push(
        sql`${stories.id} NOT IN (${sql.join(
          excludingIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      );
    }

    // Content type filter
    if (contentType?.trim()) {
      conditions.push(eq(stories.contentType, contentType.trim()));
    }

    // Level filter (depth in folder hierarchy)
    if (level !== undefined) {
      // Level = number of path segments (non-empty) in full_slug
      // e.g. "home" = level 1, "blog/post" = level 2
      conditions.push(
        sql`CARDINALITY(STRING_TO_ARRAY(TRIM(TRAILING '/' FROM ${stories.fullSlug}), '/')) = ${level}`,
      );
    }

    // Tag filter
    if (withTag?.trim()) {
      conditions.push(sql`${stories.tagList}::text ilike ${`%${withTag.trim()}%`}`);
    }

    // Startpage filter
    if (isStartpage !== undefined) {
      conditions.push(eq(stories.isStartpage, isStartpage));
    }

    // Search term
    if (searchTerm?.trim()) {
      conditions.push(
        or(
          ilike(stories.name, `%${escapeLike(searchTerm.trim())}%`),
          sql`${stories.content}::text ilike ${`%${escapeLike(searchTerm.trim())}%`}`,
        ),
      );
    }

    // Date range filters
    if (firstPublishedAtGt) {
      conditions.push(sql`${stories.firstPublishedAt} > ${new Date(firstPublishedAtGt)}`);
    }
    if (firstPublishedAtLt) {
      conditions.push(sql`${stories.firstPublishedAt} < ${new Date(firstPublishedAtLt)}`);
    }
    if (publishedAtGt) {
      conditions.push(sql`${stories.publishedAt} > ${new Date(publishedAtGt)}`);
    }
    if (publishedAtLt) {
      conditions.push(sql`${stories.publishedAt} < ${new Date(publishedAtLt)}`);
    }
    if (updatedAtGt) {
      conditions.push(sql`${stories.updatedAt} > ${new Date(updatedAtGt)}`);
    }
    if (updatedAtLt) {
      conditions.push(sql`${stories.updatedAt} < ${new Date(updatedAtLt)}`);
    }

    // Content filter_query
    if (filterQuery && typeof filterQuery === 'object') {
      const filterConditions = this.buildContentFilter(filterQuery);
      conditions.push(...filterConditions);
    }

    const where = and(...conditions);

    // Sorting
    let order: SQL = asc(stories.position);
    if (sortBy) {
      const parts = sortBy.split(':');
      const field = parts[0];
      const dir = parts[1];
      const isDesc = dir === 'desc';

      if (field.startsWith('content.')) {
        // Sort by content field
        const contentField = field.slice('content.'.length);
        if (/^[\w.]+$/.test(contentField)) {
          const txt = this.jsonbText(contentField);
          const castType = parts[2];
          const castExpr =
            castType === 'int'
              ? sql`(${txt})::integer`
              : castType === 'float'
                ? sql`(${txt})::float`
                : txt;
          order = sql`${castExpr} ${sql.raw(isDesc ? 'DESC' : 'ASC')} NULLS LAST`;
        }
      } else {
        const col =
          field === 'created_at'
            ? stories.createdAt
            : field === 'first_published_at'
              ? stories.firstPublishedAt
              : field === 'published_at'
                ? stories.publishedAt
                : field === 'updated_at'
                  ? stories.updatedAt
                  : field === 'name'
                    ? stories.name
                    : field === 'slug'
                      ? stories.slug
                      : null;
        if (col) {
          order = isDesc ? desc(col) : asc(col);
        }
      }
    }

    const rows = await this.db
      .select()
      .from(stories)
      .where(where)
      .orderBy(order)
      .limit(Math.min(perPage, 100))
      .offset((page - 1) * perPage);

    // If by_uuids_ordered, re-sort in JS to match requested order
    let resultRows = rows;
    if (byUuidsOrdered && byUuidsOrdered.length > 0) {
      const uuidOrder = new Map(byUuidsOrdered.map((u, i) => [u.trim(), i]));
      resultRows = [...rows].sort((a, b) => {
        const ai = uuidOrder.get(a.uuid) ?? Infinity;
        const bi = uuidOrder.get(b.uuid) ?? Infinity;
        return ai - bi;
      });
    }

    // Get cv (space version) and language codes
    const [space] = await this.db
      .select({ version: spaces.version, languageCodes: spaces.languageCodes })
      .from(spaces)
      .where(eq(spaces.id, spaceId))
      .limit(1);

    const languageCodes = (space?.languageCodes as string[]) ?? [];

    // Fetch release snapshots if from_release requested
    let snapshotMap = new Map<number, Record<string, any>>();
    if (fromRelease != null && resultRows.length > 0) {
      const storyIds = resultRows.map((r) => Number(r.id));
      const snapshotRows = await this.db
        .select({ storyId: storyReleases.storyId, content: storyReleases.content })
        .from(storyReleases)
        .where(
          and(eq(storyReleases.releaseId, fromRelease), inArray(storyReleases.storyId, storyIds)),
        );
      snapshotMap = new Map(snapshotRows.map((r) => [r.storyId, r.content as Record<string, any>]));
    }

    return {
      stories: resultRows.map((s) =>
        this.formatStory(
          s,
          version,
          excludingFields,
          languageCodes,
          snapshotMap.get(Number(s.id)) ?? null,
        ),
      ),
      cv: space?.version ?? 0,
      rels: [],
      links: [],
    };
  }

  // ── Single story ─────────────────────────────────────────────────────────────

  async getStory(
    spaceId: number,
    slugOrId: string,
    opts: { version?: 'published' | 'draft'; findBy?: string; fromRelease?: number } = {},
  ) {
    const { version = 'published', findBy, fromRelease } = opts;

    const conditions: (SQL | undefined)[] = [
      eq(stories.spaceId, spaceId),
      isNull(stories.deletedAt),
      eq(stories.isFolder, false),
    ];

    if (version === 'published') {
      conditions.push(eq(stories.published, true));
    }

    // Match by full_slug, slug, uuid, or id
    const isNumeric = /^\d+$/.test(slugOrId);
    const isUuid = findBy === 'uuid' || /^[0-9a-f-]{36}$/.test(slugOrId);

    if (isNumeric && findBy !== 'uuid') {
      conditions.push(eq(stories.id, BigInt(slugOrId)));
    } else if (isUuid) {
      conditions.push(eq(stories.uuid, slugOrId));
    } else {
      const s = slugOrId.replace(/\/$/, '');
      conditions.push(
        or(
          eq(stories.fullSlug, s),
          eq(stories.fullSlug, `${s}/`),
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

    ResultGuard.throwIfNotFound(row, 'Story not found');

    const [[space], releaseSnapshotRow] = await Promise.all([
      this.db
        .select({ version: spaces.version, languageCodes: spaces.languageCodes })
        .from(spaces)
        .where(eq(spaces.id, spaceId))
        .limit(1),
      fromRelease != null
        ? this.db
            .select({ content: storyReleases.content })
            .from(storyReleases)
            .where(
              and(
                eq(storyReleases.storyId, Number(row.id)),
                eq(storyReleases.releaseId, fromRelease),
              ),
            )
            .limit(1)
            .then((rows) => rows[0] ?? null)
        : Promise.resolve(null),
    ]);

    const languageCodes = (space?.languageCodes as string[]) ?? [];
    const snapshot = releaseSnapshotRow
      ? (releaseSnapshotRow.content as Record<string, any>)
      : null;

    return {
      story: this.formatStory(row, version, undefined, languageCodes, snapshot),
      cv: space?.version ?? 0,
      rels: [],
      links: [],
    };
  }
}
