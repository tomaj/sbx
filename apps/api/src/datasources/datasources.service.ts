import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, count, eq, ilike, inArray, max, or } from 'drizzle-orm';
import { ResultGuard } from '../shared/result-guard.util';
import { QueryParserUtil, escapeLike } from '../shared/query-parser.util';
import { DB } from '../db/db.module';
import { DbType } from '../db/db.module';
import { datasourceEntries, datasources, spaces } from '../db/schema';
import { WebhooksService } from '../webhooks/webhooks.service';
import { WEBHOOK_ACTIONS } from '../webhooks/webhook-actions';

interface DimensionAttribute {
  name: string;
  entry_value: string;
}

interface StoredDimension {
  id: number;
  name: string;
  entry_value: string;
  datasource_id: number;
  created_at: string;
  updated_at: string;
}

function formatDimension(d: StoredDimension) {
  return {
    id: d.id,
    name: d.name,
    entry_value: d.entry_value,
    datasource_id: d.datasource_id,
    created_at: d.created_at,
    updated_at: d.updated_at,
  };
}

function formatDatasource(ds: {
  id: bigint;
  name: string;
  slug: string;
  dimensions: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  const dims = (ds.dimensions as StoredDimension[] | null) ?? [];
  return {
    id: Number(ds.id),
    name: ds.name,
    slug: ds.slug,
    dimensions: dims.map(formatDimension),
    created_at: ds.createdAt,
    updated_at: ds.updatedAt,
  };
}

function buildDimensions(
  existing: StoredDimension[],
  attributes: DimensionAttribute[],
  datasourceId: number,
): StoredDimension[] {
  const now = new Date().toISOString();
  return attributes.map((attr) => {
    const found = existing.find((d) => d.entry_value === attr.entry_value);
    if (found) {
      return { ...found, name: attr.name, updated_at: now };
    }
    return {
      id: Math.floor(Math.random() * 1_000_000_000),
      name: attr.name,
      entry_value: attr.entry_value,
      datasource_id: datasourceId,
      created_at: now,
      updated_at: now,
    };
  });
}

@Injectable()
export class DatasourcesService {
  constructor(
    @Inject(DB) private db: DbType,
    private readonly webhooks: WebhooksService,
  ) {}

  async findAll(spaceId: number) {
    const rows = await this.db
      .select()
      .from(datasources)
      .where(eq(datasources.spaceId, spaceId))
      .orderBy(asc(datasources.id));

    return {
      datasources: rows.map(formatDatasource),
    };
  }

  private async getSpaceVersion(spaceId: number): Promise<number> {
    const [space] = await this.db
      .select({ version: spaces.version })
      .from(spaces)
      .where(eq(spaces.id, spaceId))
      .limit(1);
    return space?.version ?? 0;
  }

  async findAllCdn(spaceId: number) {
    const [rows, cv] = await Promise.all([
      this.db
        .select()
        .from(datasources)
        .where(eq(datasources.spaceId, spaceId))
        .orderBy(asc(datasources.id)),
      this.getSpaceVersion(spaceId),
    ]);

    return {
      datasources: rows.map((ds) => ({
        id: Number(ds.id),
        name: ds.name,
        slug: ds.slug,
        dimensions: (ds.dimensions as any[]) ?? [],
      })),
      cv,
    };
  }

  async findOneCdn(spaceId: number, id: number) {
    const [rows, cv] = await Promise.all([
      this.db
        .select()
        .from(datasources)
        .where(and(eq(datasources.id, BigInt(id)), eq(datasources.spaceId, spaceId)))
        .limit(1),
      this.getSpaceVersion(spaceId),
    ]);
    if (!rows.length) return null;
    const ds = rows[0];
    return {
      datasource: {
        id: Number(ds.id),
        name: ds.name,
        slug: ds.slug,
        dimensions: (ds.dimensions as any[]) ?? [],
      },
      cv,
    };
  }

  async findEntriesCdn(
    spaceId: number,
    opts: {
      datasourceSlug?: string;
      dimension?: string;
      perPage: number;
      page: number;
    },
  ) {
    const [rows, cv] = await Promise.all([
      this.db
        .select({
          id: datasourceEntries.id,
          name: datasourceEntries.name,
          value: datasourceEntries.value,
          dimensionValue: datasourceEntries.dimensionValue,
          createdAt: datasourceEntries.createdAt,
          updatedAt: datasourceEntries.updatedAt,
        })
        .from(datasourceEntries)
        .innerJoin(datasources, eq(datasourceEntries.datasourceId, datasources.id))
        .where(
          opts.datasourceSlug
            ? and(eq(datasources.spaceId, spaceId), eq(datasources.slug, opts.datasourceSlug))
            : eq(datasources.spaceId, spaceId),
        )
        .orderBy(asc(datasourceEntries.position), asc(datasourceEntries.name))
        .limit(Math.min(opts.perPage, 1000))
        .offset((opts.page - 1) * opts.perPage),
      this.getSpaceVersion(spaceId),
    ]);

    return {
      datasource_entries: rows.map((e) => ({
        id: Number(e.id),
        name: e.name,
        value: e.value,
        dimension_value: opts.dimension
          ? ((e.dimensionValue as any)?.[opts.dimension] ?? null)
          : null,
      })),
      cv,
    };
  }

  async listDatasourcesAdmin(
    spaceId: number,
    opts: {
      page: number;
      perPage: number;
      search?: string;
      sortField?: string;
      sortDir?: 'asc' | 'desc';
      byIds?: number[];
    },
  ) {
    const { page, perPage, search, sortField, sortDir, byIds } = opts;
    const where = QueryParserUtil.buildWhere(
      eq(datasources.spaceId, spaceId),
      search ? ilike(datasources.name, `%${escapeLike(search)}%`) : null,
      byIds && byIds.length > 0 ? inArray(datasources.id, byIds.map(BigInt)) : null,
    );

    const orderCol = sortField === 'created_at' ? datasources.createdAt : datasources.name;
    const orderFn = sortDir === 'desc' ? desc(orderCol) : asc(orderCol);

    const [rows, totals] = await Promise.all([
      this.db
        .select()
        .from(datasources)
        .where(where)
        .orderBy(orderFn)
        .limit(perPage)
        .offset((page - 1) * perPage),
      this.db.select({ total: count() }).from(datasources).where(where),
    ]);

    return {
      datasources: rows.map(formatDatasource),
      total: Number(totals[0]?.total ?? 0),
      page,
      per_page: perPage,
    };
  }

  async createDatasource(
    spaceId: number,
    data: { name: string; slug: string; dimensions_attributes?: DimensionAttribute[] },
  ) {
    const id = BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000));
    const uuid = crypto.randomUUID();
    const dimensions: StoredDimension[] = data.dimensions_attributes
      ? buildDimensions([], data.dimensions_attributes, Number(id))
      : [];

    const [row] = await this.db
      .insert(datasources)
      .values({ id, uuid, spaceId, name: data.name, slug: data.slug, dimensions })
      .returning();
    return formatDatasource(row);
  }

  async updateDatasource(
    id: bigint,
    spaceId: number,
    data: { name?: string; slug?: string; dimensions_attributes?: DimensionAttribute[] },
  ) {
    const existing = await this.db
      .select()
      .from(datasources)
      .where(and(eq(datasources.id, id), eq(datasources.spaceId, spaceId)))
      .limit(1);
    ResultGuard.throwIfNotFound(existing[0], 'Datasource not found');

    const existingDims = (existing[0].dimensions as StoredDimension[] | null) ?? [];
    const updateData: any = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.dimensions_attributes) {
      updateData.dimensions = buildDimensions(existingDims, data.dimensions_attributes, Number(id));
    }

    const [row] = await this.db
      .update(datasources)
      .set(updateData)
      .where(and(eq(datasources.id, id), eq(datasources.spaceId, spaceId)))
      .returning();
    ResultGuard.throwIfNotFound(row, 'Datasource not found');
    return formatDatasource(row);
  }

  async deleteDatasource(id: bigint, spaceId: number) {
    await this.db
      .delete(datasources)
      .where(and(eq(datasources.id, id), eq(datasources.spaceId, spaceId)));
    return { success: true };
  }

  async listEntriesAdmin(
    datasourceId: bigint,
    _spaceId: number,
    opts: { page: number; perPage: number; search?: string },
  ) {
    const { page, perPage, search } = opts;
    const where = QueryParserUtil.buildWhere(
      eq(datasourceEntries.datasourceId, datasourceId),
      search
        ? or(
            ilike(datasourceEntries.name, `%${escapeLike(search)}%`),
            ilike(datasourceEntries.value, `%${escapeLike(search)}%`),
          )
        : null,
    );

    const [rows, totals] = await Promise.all([
      this.db
        .select()
        .from(datasourceEntries)
        .where(where)
        .orderBy(asc(datasourceEntries.position), asc(datasourceEntries.name))
        .limit(perPage)
        .offset((page - 1) * perPage),
      this.db.select({ total: count() }).from(datasourceEntries).where(where),
    ]);

    return {
      entries: rows.map((e) => ({
        id: Number(e.id),
        name: e.name,
        value: e.value,
        position: e.position,
        created_at: e.createdAt,
        updated_at: e.updatedAt,
      })),
      total: Number(totals[0]?.total ?? 0),
      page,
      perPage,
    };
  }

  async createEntry(
    datasourceId: bigint,
    data: { name: string; value: string; position?: number },
  ) {
    const id = BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000));
    let position = data.position;
    if (position === undefined || position === 0) {
      const [{ maxPos }] = await this.db
        .select({ maxPos: max(datasourceEntries.position) })
        .from(datasourceEntries)
        .where(eq(datasourceEntries.datasourceId, datasourceId));
      position = (maxPos ?? 0) + 1;
    }
    const [row] = await this.db
      .insert(datasourceEntries)
      .values({
        id,
        datasourceId,
        name: data.name,
        value: data.value,
        dimensionValue: {},
        position,
      })
      .returning();

    void this.dispatchDatasourceEntryEvent(
      datasourceId,
      WEBHOOK_ACTIONS.DATASOURCE_ENTRIES_UPDATED,
      {
        action: 'datasource_entries_updated',
        entry_id: Number(row.id),
        name: row.name,
        value: row.value,
      },
    );

    return {
      id: Number(row.id),
      name: row.name,
      value: row.value,
      dimension_value: null,
      position: row.position,
      datasource_id: Number(datasourceId),
    };
  }

  async updateEntry(
    entryId: bigint,
    datasourceId: bigint,
    data: {
      name?: string;
      value?: string;
      position?: number;
      dimension_value?: string;
      dimension_entry_value?: string;
    },
  ) {
    const updateData: any = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.value !== undefined) updateData.value = data.value;
    if (data.position !== undefined) updateData.position = data.position;

    if (data.dimension_value !== undefined && data.dimension_entry_value) {
      const existing = await this.db
        .select({ dimensionValue: datasourceEntries.dimensionValue })
        .from(datasourceEntries)
        .where(
          and(eq(datasourceEntries.id, entryId), eq(datasourceEntries.datasourceId, datasourceId)),
        )
        .limit(1);
      const currentDimVal = (existing[0]?.dimensionValue as Record<string, string>) ?? {};
      updateData.dimensionValue = {
        ...currentDimVal,
        [data.dimension_entry_value]: data.dimension_value,
      };
    }

    const [row] = await this.db
      .update(datasourceEntries)
      .set(updateData)
      .where(
        and(eq(datasourceEntries.id, entryId), eq(datasourceEntries.datasourceId, datasourceId)),
      )
      .returning();
    ResultGuard.throwIfNotFound(row, 'Entry not found');

    void this.dispatchDatasourceEntryEvent(
      datasourceId,
      WEBHOOK_ACTIONS.DATASOURCE_ENTRIES_UPDATED,
      {
        action: 'datasource_entries_updated',
        entry_id: Number(row.id),
        name: row.name,
        value: row.value,
      },
    );

    return {
      id: Number(row.id),
      name: row.name,
      value: row.value,
      dimension_value: data.dimension_value ?? null,
      position: row.position,
      datasource_id: Number(datasourceId),
    };
  }

  async deleteEntry(entryId: bigint, datasourceId: bigint) {
    await this.db
      .delete(datasourceEntries)
      .where(
        and(eq(datasourceEntries.id, entryId), eq(datasourceEntries.datasourceId, datasourceId)),
      );

    void this.dispatchDatasourceEntryEvent(
      datasourceId,
      WEBHOOK_ACTIONS.DATASOURCE_ENTRIES_UPDATED,
      {
        action: 'datasource_entries_updated',
        entry_id: Number(entryId),
      },
    );

    return { success: true };
  }

  private async dispatchDatasourceEntryEvent(
    datasourceId: bigint,
    action: string,
    extra: Record<string, unknown>,
  ) {
    const [ds] = await this.db
      .select({ spaceId: datasources.spaceId, slug: datasources.slug })
      .from(datasources)
      .where(eq(datasources.id, datasourceId))
      .limit(1);
    if (!ds) return;

    await this.webhooks.dispatch(ds.spaceId, action, {
      space_id: ds.spaceId,
      datasource_id: Number(datasourceId),
      datasource_slug: ds.slug,
      ...extra,
    });
  }

  async reorderEntries(datasourceId: bigint, sortedIds: number[]) {
    await this.db.transaction(async (tx) => {
      for (let i = 0; i < sortedIds.length; i++) {
        await tx
          .update(datasourceEntries)
          .set({ position: i })
          .where(
            and(
              eq(datasourceEntries.id, BigInt(sortedIds[i])),
              eq(datasourceEntries.datasourceId, datasourceId),
            ),
          );
      }
    });
    return { success: true };
  }

  async findOne(spaceId: number, id: number) {
    const rows = await this.db
      .select()
      .from(datasources)
      .where(and(eq(datasources.id, BigInt(id)), eq(datasources.spaceId, spaceId)))
      .limit(1);
    if (!rows.length) return null;
    return { datasource: formatDatasource(rows[0]) };
  }

  async findEntry(entryId: number, datasourceId: number) {
    const rows = await this.db
      .select()
      .from(datasourceEntries)
      .where(
        and(
          eq(datasourceEntries.id, BigInt(entryId)),
          eq(datasourceEntries.datasourceId, BigInt(datasourceId)),
        ),
      )
      .limit(1);
    if (!rows.length) return null;
    const e = rows[0];
    return {
      datasource_entry: {
        id: Number(e.id),
        name: e.name,
        value: e.value,
        datasource_id: Number(e.datasourceId),
        dimension_value: null,
        position: e.position,
        created_at: e.createdAt,
        updated_at: e.updatedAt,
      },
    };
  }

  async findAllEntries(
    spaceId: number,
    datasourceId?: number,
    page = 1,
    perPage = 25,
    opts?: { search?: string; dimensionEntryValue?: string },
  ) {
    const where = QueryParserUtil.buildWhere(
      eq(datasources.spaceId, spaceId),
      datasourceId ? eq(datasourceEntries.datasourceId, BigInt(datasourceId)) : null,
      opts?.search
        ? or(
            ilike(datasourceEntries.name, `%${escapeLike(opts.search)}%`),
            ilike(datasourceEntries.value, `%${escapeLike(opts.search)}%`),
          )
        : null,
    );

    const [rows, totals] = await Promise.all([
      this.db
        .select({
          id: datasourceEntries.id,
          name: datasourceEntries.name,
          value: datasourceEntries.value,
          datasourceId: datasourceEntries.datasourceId,
          dimensionValue: datasourceEntries.dimensionValue,
          position: datasourceEntries.position,
          createdAt: datasourceEntries.createdAt,
          updatedAt: datasourceEntries.updatedAt,
        })
        .from(datasourceEntries)
        .innerJoin(datasources, eq(datasourceEntries.datasourceId, datasources.id))
        .where(where)
        .orderBy(asc(datasourceEntries.position), asc(datasourceEntries.name))
        .limit(perPage)
        .offset((page - 1) * perPage),
      this.db
        .select({ total: count() })
        .from(datasourceEntries)
        .innerJoin(datasources, eq(datasourceEntries.datasourceId, datasources.id))
        .where(where),
    ]);

    return {
      datasource_entries: rows.map((e) => ({
        id: Number(e.id),
        name: e.name,
        value: e.value,
        datasource_id: Number(e.datasourceId),
        dimension_value: opts?.dimensionEntryValue
          ? ((e.dimensionValue as any)?.[opts.dimensionEntryValue] ?? null)
          : null,
        position: e.position,
      })),
      total: Number(totals[0]?.total ?? 0),
      page,
      per_page: perPage,
    };
  }

  async findEntries(
    spaceId: number,
    opts: {
      datasourceSlug?: string;
      dimension?: string;
      perPage: number;
      page: number;
    },
  ) {
    const rows = await this.db
      .select({
        id: datasourceEntries.id,
        name: datasourceEntries.name,
        value: datasourceEntries.value,
        dimensionValue: datasourceEntries.dimensionValue,
        createdAt: datasourceEntries.createdAt,
        updatedAt: datasourceEntries.updatedAt,
      })
      .from(datasourceEntries)
      .innerJoin(datasources, eq(datasourceEntries.datasourceId, datasources.id))
      .where(
        opts.datasourceSlug
          ? eq(datasources.slug, opts.datasourceSlug)
          : eq(datasources.spaceId, spaceId),
      )
      .orderBy(asc(datasourceEntries.name))
      .limit(opts.perPage)
      .offset((opts.page - 1) * opts.perPage);

    return {
      datasource_entries: rows.map((e) => ({
        id: Number(e.id),
        name: e.name,
        value: e.value,
        dimension_value: opts.dimension
          ? ((e.dimensionValue as any)?.[opts.dimension] ?? null)
          : null,
        created_at: e.createdAt,
        updated_at: e.updatedAt,
      })),
    };
  }
}
