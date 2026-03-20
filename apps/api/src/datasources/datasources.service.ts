import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
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
