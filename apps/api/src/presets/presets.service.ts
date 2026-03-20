import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { presets } from '../db/schema';

@Injectable()
export class PresetsService {
  constructor(@Inject(DB) private db: DbType) {}

  async findAll(spaceId: number) {
    const rows = await this.db
      .select()
      .from(presets)
      .where(eq(presets.spaceId, spaceId))
      .orderBy(asc(presets.id));

    return { presets: rows.map((p) => this.format(p)) };
  }

  async findOne(spaceId: number, id: number) {
    const [row] = await this.db
      .select()
      .from(presets)
      .where(eq(presets.id, BigInt(id)))
      .limit(1);

    if (!row || row.spaceId !== spaceId) return null;
    return { preset: this.format(row) };
  }

  private format(p: typeof presets.$inferSelect) {
    return {
      id: Number(p.id),
      name: p.name,
      preset: p.preset,
      component_id: Number(p.componentId),
      space_id: p.spaceId,
      image: p.image ?? '',
      color: p.color ?? '',
      icon: p.icon ?? '',
      description: p.description ?? '',
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    };
  }
}
