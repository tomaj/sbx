import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
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
      .where(eq(branches.spaceId, spaceId));

    return { branches: rows.map((b) => this.format(b)) };
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
