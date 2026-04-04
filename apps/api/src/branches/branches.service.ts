import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, ilike, inArray } from 'drizzle-orm';
import { escapeLike } from '../shared/query-parser.util';
import { DB } from '../db/db.module';
import { DbType } from '../db/db.module';
import { branches } from '../db/schema';

@Injectable()
export class BranchesService {
  constructor(@Inject(DB) private db: DbType) {}

  async findAll(spaceId: number, opts?: { by_ids?: string; search?: string }) {
    const conditions = [eq(branches.spaceId, spaceId)];

    if (opts?.by_ids) {
      const ids = opts.by_ids
        .split(',')
        .slice(0, 1000)
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n));
      if (ids.length > 0) {
        conditions.push(inArray(branches.id, ids));
      }
    }

    if (opts?.search) {
      conditions.push(ilike(branches.name, `%${escapeLike(opts.search)}%`));
    }

    const rows = await this.db
      .select()
      .from(branches)
      .where(and(...conditions))
      .orderBy(asc(branches.position), asc(branches.id));

    return { branches: rows.map((b) => this.format(b)) };
  }

  async create(
    spaceId: number,
    data: { name: string; url?: string; position?: number; source_id?: number },
  ) {
    const [last] = await this.db
      .select({ id: branches.id })
      .from(branches)
      .orderBy(desc(branches.id))
      .limit(1);
    const nextId = last ? last.id + 1 : 1;
    const [row] = await this.db
      .insert(branches)
      .values({
        id: nextId,
        spaceId,
        name: data.name,
        url: data.url ?? null,
        ...(data.position !== undefined && { position: data.position }),
        ...(data.source_id !== undefined && { sourceId: data.source_id }),
      })
      .returning();
    return { branch: this.format(row) };
  }

  async update(
    spaceId: number,
    id: number,
    data: { name?: string; url?: string | null; position?: number; source_id?: number | null },
  ) {
    const [row] = await this.db
      .update(branches)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.url !== undefined && { url: data.url }),
        ...(data.position !== undefined && { position: data.position }),
        ...(data.source_id !== undefined && { sourceId: data.source_id }),
        updatedAt: new Date(),
      })
      .where(eq(branches.id, id))
      .returning();
    if (!row || row.spaceId !== spaceId) return null;
    return { branch: this.format(row) };
  }

  async remove(spaceId: number, id: number) {
    const [row] = await this.db.delete(branches).where(eq(branches.id, id)).returning();
    if (!row || row.spaceId !== spaceId) return null;
    return true;
  }

  async findOne(spaceId: number, id: number) {
    const [row] = await this.db.select().from(branches).where(eq(branches.id, id)).limit(1);

    if (!row || row.spaceId !== spaceId) return null;
    return { branch: this.format(row) };
  }

  async createDeployment(spaceId: number, branchId: number, releaseUuids?: string[]) {
    // Update the branch deployed_at timestamp
    const [row] = await this.db
      .update(branches)
      .set({ deployedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(branches.id, branchId), eq(branches.spaceId, spaceId)))
      .returning();
    if (!row) return { deployment: {} };
    return {
      deployment: {
        branch_id: branchId,
        release_uuids: releaseUuids ?? [],
        deployed_at: row.deployedAt,
      },
    };
  }

  private format(b: typeof branches.$inferSelect) {
    return {
      id: b.id,
      name: b.name,
      space_id: b.spaceId,
      source_id: b.sourceId ?? null,
      url: b.url ?? null,
      position: b.position,
      deployed_at: b.deployedAt ?? null,
      deleted_at: b.deletedAt ?? null,
      created_at: b.createdAt,
      updated_at: b.updatedAt,
    };
  }
}
