import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { componentGroups, components } from '../db/schema';

@Injectable()
export class ComponentsService {
  constructor(@Inject(DB) private db: DbType) {}

  async findAllComponents(spaceId: number) {
    const rows = await this.db
      .select()
      .from(components)
      .where(eq(components.spaceId, spaceId))
      .orderBy(asc(components.id));

    return {
      components: rows.map((c) => this.formatComponent(c)),
    };
  }

  async findOneComponent(spaceId: number, id: number) {
    const [row] = await this.db
      .select()
      .from(components)
      .where(eq(components.id, BigInt(id)))
      .limit(1);

    if (!row || row.spaceId !== spaceId) return null;
    return { component: this.formatComponent(row) };
  }

  async findAllComponentGroups(spaceId: number) {
    const rows = await this.db
      .select()
      .from(componentGroups)
      .where(eq(componentGroups.spaceId, spaceId))
      .orderBy(asc(componentGroups.name));

    return {
      component_groups: rows.map((g) => ({
        id: Number(g.id),
        uuid: g.uuid,
        name: g.name,
        parent_id: g.parentId ? Number(g.parentId) : null,
        parent_uuid: g.parentUuid ?? null,
      })),
    };
  }

  private formatComponent(c: typeof components.$inferSelect) {
    return {
      id: Number(c.id),
      name: c.name,
      display_name: c.displayName ?? null,
      description: c.description ?? '',
      created_at: c.createdAt,
      updated_at: c.updatedAt,
      schema: c.schema,
      image: c.image ?? null,
      preview_field: c.previewField ?? null,
      preview_tmpl: c.previewTmpl ?? null,
      is_root: c.isRoot,
      is_nestable: c.isNestable,
      all_presets: c.allPresets,
      component_group_uuid: c.componentGroupUuid ?? null,
      color: c.color ?? null,
      icon: c.icon ?? null,
      internal_tags_list: c.internalTagsList,
      internal_tag_ids: c.internalTagIds,
      content_type_asset_preview: c.contentTypeAssetPreview ?? null,
    };
  }
}
