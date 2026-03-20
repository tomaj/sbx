import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, count, eq, ilike, max, or } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { datasourceEntries, datasources } from '../db/schema';

@Injectable()
export class DatasourcesService {
  constructor(@Inject(DB) private db: DbType) {}

  async findAll(spaceId: number) {
    const rows = await this.db
      .select()
      .from(datasources)
      .where(eq(datasources.spaceId, spaceId))
      .orderBy(asc(datasources.id));

    return {
      datasources: rows.map((ds) => ({
        id: Number(ds.id),
        name: ds.name,
        slug: ds.slug,
        dimensions: [],
        created_at: ds.createdAt,
        updated_at: ds.updatedAt,
      })),
    };
  }

  async listDatasourcesAdmin(
    spaceId: number,
    opts: { page: number; perPage: number; search?: string; sortField?: string; sortDir?: 'asc' | 'desc' },
  ) {
    const { page, perPage, search, sortField, sortDir } = opts;
    const conditions: any[] = [eq(datasources.spaceId, spaceId)];
    if (search) conditions.push(ilike(datasources.name, `%${search}%`));
    const where = and(...conditions);

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
      datasources: rows.map((ds) => ({
        id: Number(ds.id),
        name: ds.name,
        slug: ds.slug,
        created_at: ds.createdAt,
        updated_at: ds.updatedAt,
      })),
      total: Number(totals[0]?.total ?? 0),
      page,
      perPage,
    };
  }

  async createDatasource(spaceId: number, data: { name: string; slug: string }) {
    const id = BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000));
    const uuid = crypto.randomUUID();
    const [row] = await this.db
      .insert(datasources)
      .values({ id, uuid, spaceId, name: data.name, slug: data.slug })
      .returning();
    return {
      id: Number(row.id),
      name: row.name,
      slug: row.slug,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  async updateDatasource(
    id: bigint,
    spaceId: number,
    data: { name?: string; slug?: string },
  ) {
    const [row] = await this.db
      .update(datasources)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(datasources.id, id), eq(datasources.spaceId, spaceId)))
      .returning();
    if (!row) throw new NotFoundException('Datasource not found');
    return { id: Number(row.id), name: row.name, slug: row.slug };
  }

  async deleteDatasource(id: bigint, spaceId: number) {
    await this.db
      .delete(datasources)
      .where(and(eq(datasources.id, id), eq(datasources.spaceId, spaceId)));
    return { success: true };
  }

  async listEntriesAdmin(
    datasourceId: bigint,
    spaceId: number,
    opts: { page: number; perPage: number; search?: string },
  ) {
    const { page, perPage, search } = opts;
    const conditions: any[] = [
      eq(datasourceEntries.datasourceId, datasourceId),
    ];
    if (search) {
      conditions.push(
        or(
          ilike(datasourceEntries.name, `%${search}%`),
          ilike(datasourceEntries.value, `%${search}%`),
        ),
      );
    }
    const where = and(...conditions);

    const [rows, totals] = await Promise.all([
      this.db
        .select()
        .from(datasourceEntries)
        .where(where)
        .orderBy(asc(datasourceEntries.position), asc(datasourceEntries.name))
        .limit(perPage)
        .offset((page - 1) * perPage),
      this.db
        .select({ total: count() })
        .from(datasourceEntries)
        .where(where),
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

  async createEntry(datasourceId: bigint, data: { name: string; value: string }) {
    const id = BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000));
    const [{ maxPos }] = await this.db
      .select({ maxPos: max(datasourceEntries.position) })
      .from(datasourceEntries)
      .where(eq(datasourceEntries.datasourceId, datasourceId));
    const position = (maxPos ?? 0) + 1;
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
    return {
      id: Number(row.id),
      name: row.name,
      value: row.value,
      position: row.position,
    };
  }

  async updateEntry(
    entryId: bigint,
    datasourceId: bigint,
    data: { name?: string; value?: string },
  ) {
    const [row] = await this.db
      .update(datasourceEntries)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(datasourceEntries.id, entryId),
          eq(datasourceEntries.datasourceId, datasourceId),
        ),
      )
      .returning();
    if (!row) throw new NotFoundException('Entry not found');
    return { id: Number(row.id), name: row.name, value: row.value };
  }

  async deleteEntry(entryId: bigint, datasourceId: bigint) {
    await this.db
      .delete(datasourceEntries)
      .where(
        and(
          eq(datasourceEntries.id, entryId),
          eq(datasourceEntries.datasourceId, datasourceId),
        ),
      );
    return { success: true };
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

  async findEntries(
    spaceId: number,
    opts: {
      datasourceSlug?: string;
      dimension?: string;
      perPage: number;
      page: number;
    },
  ) {
    // Build base query joining datasource for spaceId + optional slug filter
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
      .innerJoin(
        datasources,
        eq(datasourceEntries.datasourceId, datasources.id),
      )
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
