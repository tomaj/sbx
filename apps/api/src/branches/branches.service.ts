import { Inject, Injectable } from '@nestjs/common';
import { asc, desc, eq } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { branches } from '../db/schema';

@Injectable()
export class BranchesService {
  constructor(@Inject(DB) private db: DbType) {}

  async findAll(spaceId: number) {
    const rows = await this.db
      .select()
      .from(branches)
      .where(eq(branches.spaceId, spaceId))
      .orderBy(asc(branches.position), asc(branches.id));

    return { branches: rows.map((b) => this.format(b)) };
  }

  async create(spaceId: number, data: { name: string; url?: string }) {
    const [last] = await this.db.select({ id: branches.id }).from(branches).orderBy(desc(branches.id)).limit(1);
    const nextId = last ? last.id + 1 : 1;
    const [row] = await this.db
      .insert(branches)
      .values({ id: nextId, spaceId, name: data.name, url: data.url ?? null })
      .returning();
    return { branch: this.format(row) };
  }

  async update(spaceId: number, id: number, data: { name?: string; url?: string | null }) {
    const [row] = await this.db
      .update(branches)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.url !== undefined && { url: data.url }),
        updatedAt: new Date(),
      })
      .where(eq(branches.id, id))
      .returning();
    if (!row || row.spaceId !== spaceId) return null;
    return { branch: this.format(row) };
  }

  async remove(spaceId: number, id: number) {
    const [row] = await this.db
      .delete(branches)
      .where(eq(branches.id, id))
      .returning();
    if (!row || row.spaceId !== spaceId) return null;
    return { branch: this.format(row) };
  }

  async findOne(spaceId: number, id: number) {
    const [row] = await this.db
      .select()
      .from(branches)
      .where(eq(branches.id, id))
      .limit(1);

    if (!row || row.spaceId !== spaceId) return null;
    return { branch: this.format(row) };
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
