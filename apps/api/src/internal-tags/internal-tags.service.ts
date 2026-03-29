import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { internalTags, components, assets } from '../db/schema';

@Injectable()
export class InternalTagsService {
  constructor(@Inject(DB) private db: DbType) {}

  async listTags(spaceId: number, objectType?: string) {
    const conditions = [eq(internalTags.spaceId, spaceId)];
    if (objectType) conditions.push(eq(internalTags.objectType, objectType));

    const tableRows = await this.db
      .select()
      .from(internalTags)
      .where(and(...conditions))
      .orderBy(asc(internalTags.name));

    // Build count map and derive any tags present in component/asset data but not in the table
    const countById: Record<number, number> = {};
    // orphan tags: present in component/asset JSON but not yet in internal_tags table
    const orphanById = new Map<number, { name: string; objectType: string }>();

    if (!objectType || objectType === 'component') {
      const compRows = await this.db
        .select({ internalTagIds: components.internalTagIds, internalTagsList: components.internalTagsList })
        .from(components)
        .where(eq(components.spaceId, spaceId));
      for (const row of compRows) {
        const ids: string[] = (row.internalTagIds as any) ?? [];
        const list: { id: number; name: string }[] = (row.internalTagsList as any) ?? [];
        for (const id of ids) countById[Number(id)] = (countById[Number(id)] ?? 0) + 1;
        for (const t of list) {
          if (!orphanById.has(t.id)) orphanById.set(t.id, { name: t.name, objectType: 'component' });
        }
      }
    }
    if (!objectType || objectType === 'asset') {
      const assetRows = await this.db
        .select({ internalTagIds: assets.internalTagIds, internalTagsList: assets.internalTagsList })
        .from(assets)
        .where(eq(assets.spaceId, spaceId));
      for (const row of assetRows) {
        const ids: string[] = (row.internalTagIds as any) ?? [];
        const list: { id: number; name: string }[] = (row.internalTagsList as any) ?? [];
        for (const id of ids) countById[Number(id)] = (countById[Number(id)] ?? 0) + 1;
        for (const t of list) {
          if (!orphanById.has(t.id)) orphanById.set(t.id, { name: t.name, objectType: 'asset' });
        }
      }
    }

    // Tags in table (canonical)
    const result = tableRows.map((t) => this.format(t, countById[t.id] ?? 0));
    const tableIds = new Set(tableRows.map((t) => t.id));

    // Orphan tags from component/asset data not in table — insert preserving original IDs
    for (const [id, tag] of orphanById.entries()) {
      if (!tableIds.has(id)) {
        // Insert with explicit ID (overrides bigserial default)
        const inserted = await this.db
          .insert(internalTags)
          .values({ id, spaceId, name: tag.name, objectType: tag.objectType })
          .onConflictDoNothing()
          .returning()
          .catch(() => [] as (typeof internalTags.$inferSelect)[]);
        if (inserted.length > 0) {
          result.push(this.format(inserted[0], countById[id] ?? 0));
        } else {
          // Already exists (race condition) — add to result with count
          result.push({ id, name: tag.name, object_type: tag.objectType, count: countById[id] ?? 0 });
        }
      }
    }
    // After inserting with explicit IDs, advance the sequence past known imported IDs
    // so future auto-generated IDs don't collide
    if (orphanById.size > 0) {
      const maxId = Math.max(...Array.from(orphanById.keys()));
      await this.db.execute(sql`SELECT setval(pg_get_serial_sequence('internal_tags', 'id'), GREATEST(nextval(pg_get_serial_sequence('internal_tags', 'id')), ${maxId + 1}))`).catch(() => {});
    }

    result.sort((a, b) => a.name.localeCompare(b.name));
    return { internal_tags: result };
  }

  async createTag(spaceId: number, name: string, objectType: string = 'component') {
    const [row] = await this.db
      .insert(internalTags)
      .values({ spaceId, name, objectType })
      .returning();
    return { internal_tag: this.format(row, 0) };
  }

  async updateTag(spaceId: number, id: number, name: string) {
    const [row] = await this.db
      .update(internalTags)
      .set({ name })
      .where(and(eq(internalTags.id, id), eq(internalTags.spaceId, spaceId)))
      .returning();
    if (!row) throw new NotFoundException('Tag not found');

    // Update name on all components/assets that reference this tag
    if (row.objectType === 'component') {
      const compRows = await this.db
        .select({ id: components.id, internalTagsList: components.internalTagsList })
        .from(components)
        .where(eq(components.spaceId, spaceId));
      for (const c of compRows) {
        const list: { id: number; name: string }[] = (c.internalTagsList as any) ?? [];
        if (list.some((t) => t.id === id)) {
          await this.db
            .update(components)
            .set({ internalTagsList: list.map((t) => (t.id === id ? { ...t, name } : t)), updatedAt: new Date() })
            .where(eq(components.id, c.id));
        }
      }
    } else {
      const assetRows = await this.db
        .select({ id: assets.id, internalTagsList: assets.internalTagsList })
        .from(assets)
        .where(eq(assets.spaceId, spaceId));
      for (const a of assetRows) {
        const list: { id: number; name: string }[] = (a.internalTagsList as any) ?? [];
        if (list.some((t) => t.id === id)) {
          await this.db
            .update(assets)
            .set({ internalTagsList: list.map((t) => (t.id === id ? { ...t, name } : t)), updatedAt: new Date() })
            .where(eq(assets.id, a.id));
        }
      }
    }
    return { internal_tag: this.format(row, 0) };
  }

  async deleteTag(spaceId: number, id: number) {
    const [row] = await this.db
      .delete(internalTags)
      .where(and(eq(internalTags.id, id), eq(internalTags.spaceId, spaceId)))
      .returning();
    if (!row) throw new NotFoundException('Tag not found');

    // Remove from all components/assets
    if (row.objectType === 'component') {
      const compRows = await this.db
        .select({ id: components.id, internalTagsList: components.internalTagsList, internalTagIds: components.internalTagIds })
        .from(components)
        .where(eq(components.spaceId, spaceId));
      for (const c of compRows) {
        const list: { id: number; name: string }[] = (c.internalTagsList as any) ?? [];
        if (list.some((t) => t.id === id)) {
          const newList = list.filter((t) => t.id !== id);
          await this.db
            .update(components)
            .set({ internalTagsList: newList, internalTagIds: newList.map((t) => String(t.id)), updatedAt: new Date() })
            .where(eq(components.id, c.id));
        }
      }
    } else {
      const assetRows = await this.db
        .select({ id: assets.id, internalTagsList: assets.internalTagsList, internalTagIds: assets.internalTagIds })
        .from(assets)
        .where(eq(assets.spaceId, spaceId));
      for (const a of assetRows) {
        const list: { id: number; name: string }[] = (a.internalTagsList as any) ?? [];
        if (list.some((t) => t.id === id)) {
          const newList = list.filter((t) => t.id !== id);
          await this.db
            .update(assets)
            .set({ internalTagsList: newList, internalTagIds: newList.map((t) => String(t.id)), updatedAt: new Date() })
            .where(eq(assets.id, a.id));
        }
      }
    }
    return {};
  }

  private format(t: typeof internalTags.$inferSelect, count: number) {
    return { id: t.id, name: t.name, object_type: t.objectType, count };
  }
}
