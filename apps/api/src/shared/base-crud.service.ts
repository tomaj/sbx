import { Inject } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DB } from '../db/db.module';
import { DbType } from '../db/db.module';
import { PgColumn } from 'drizzle-orm/pg-core';

/**
 * Abstract base class for simple space-scoped CRUD services.
 *
 * Subclasses provide:
 *  - `table`        — the Drizzle table object
 *  - `idColumn`     — the primary key column
 *  - `spaceColumn`  — the spaceId foreign-key column
 *  - `orderColumn`  — column used for default ordering
 *  - `format(row)`  — maps a raw DB row to the API response shape
 *  - `wrapList()`   — wraps formatted rows under the correct response key
 *  - `wrapOne()`    — wraps a single formatted row under the correct response key
 *
 * Only extend this for services that have straightforward single-table CRUD
 * with no complex joins or business logic.
 */
export abstract class BaseCrudService<TFormatted> {
  constructor(@Inject(DB) protected readonly db: DbType) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected abstract get table(): any;
  protected abstract get idColumn(): PgColumn;
  protected abstract get spaceColumn(): PgColumn;
  protected abstract get orderColumn(): PgColumn;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected abstract format(row: any): TFormatted;

  async findAll(spaceId: number): Promise<Record<string, TFormatted[]>> {
    const rows = await this.db
      .select()
      .from(this.table)
      .where(eq(this.spaceColumn, spaceId))
      .orderBy(asc(this.orderColumn));

    return this.wrapList(rows.map((r: unknown) => this.format(r)));
  }

  async findOne(spaceId: number, id: number): Promise<Record<string, TFormatted> | null> {
    const [row] = await this.db
      .select()
      .from(this.table)
      .where(and(eq(this.idColumn, id), eq(this.spaceColumn, spaceId)))
      .limit(1);

    if (!row) return null;
    return this.wrapOne(this.format(row));
  }

  async remove(spaceId: number, id: number): Promise<Record<string, TFormatted> | null> {
    const rows = await this.db
      .delete(this.table)
      .where(and(eq(this.idColumn, id), eq(this.spaceColumn, spaceId)))
      .returning();

    const deleted = Array.isArray(rows) ? rows[0] : undefined;
    if (!deleted) return null;
    return this.wrapOne(this.format(deleted));
  }

  /**
   * Wrap a list of formatted rows. Override to use the correct response key.
   */
  protected wrapList(items: TFormatted[]): Record<string, TFormatted[]> {
    return { items };
  }

  /**
   * Wrap a single formatted row. Override to use the correct response key.
   */
  protected wrapOne(item: TFormatted): Record<string, TFormatted> {
    return { item };
  }
}
