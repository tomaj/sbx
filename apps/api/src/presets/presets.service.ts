import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DB } from '../db/db.module';
import { DbType } from '../db/db.module';
import { presets } from '../db/schema';

@Injectable()
export class PresetsService {
  constructor(@Inject(DB) private db: DbType) {}

  async findAll(spaceId: number, componentId?: number) {
    const conditions = [eq(presets.spaceId, spaceId)];
    if (componentId !== undefined) {
      conditions.push(eq(presets.componentId, BigInt(componentId)));
    }

    const rows = await this.db
      .select()
      .from(presets)
      .where(and(...conditions))
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

  async create(
    spaceId: number,
    data: {
      name: string;
      component_id: number;
      preset?: Record<string, any>;
      image?: string;
      color?: string;
      icon?: string;
      description?: string;
    },
  ) {
    const id = BigInt(Number(Date.now()) * 1000 + Math.floor(Math.random() * 1000));

    const [created] = await this.db
      .insert(presets)
      .values({
        id,
        spaceId,
        componentId: BigInt(data.component_id),
        name: data.name,
        preset: data.preset ?? {},
        image: data.image ?? null,
        color: data.color ?? null,
        icon: data.icon ?? null,
        description: data.description ?? null,
      })
      .returning();

    return { preset: this.format(created) };
  }

  async update(
    spaceId: number,
    id: number,
    data: {
      name?: string;
      component_id?: number;
      preset?: Record<string, any>;
      image?: string | null;
      color?: string | null;
      icon?: string | null;
      description?: string | null;
    },
  ) {
    const [updated] = await this.db
      .update(presets)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.component_id !== undefined && { componentId: BigInt(data.component_id) }),
        ...(data.preset !== undefined && { preset: data.preset }),
        ...(data.image !== undefined && { image: data.image }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.description !== undefined && { description: data.description }),
        updatedAt: new Date(),
      })
      .where(and(eq(presets.id, BigInt(id)), eq(presets.spaceId, spaceId)))
      .returning();

    if (!updated) return null;
    return { preset: this.format(updated) };
  }

  async remove(spaceId: number, id: number) {
    const [deleted] = await this.db
      .delete(presets)
      .where(and(eq(presets.id, BigInt(id)), eq(presets.spaceId, spaceId)))
      .returning();

    if (!deleted) return null;
    return { preset: this.format(deleted) };
  }

  private format(p: typeof presets.$inferSelect) {
    return {
      id: Number(p.id),
      name: p.name,
      preset: p.preset,
      component_id: Number(p.componentId),
      space_id: p.spaceId,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
      image: p.image ?? null,
      color: p.color ?? null,
      icon: p.icon ?? null,
      description: p.description ?? null,
    };
  }
}
