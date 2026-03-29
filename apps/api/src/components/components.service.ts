import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SQL, and, asc, count, desc, eq, ilike, inArray, isNull } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { componentGroups, components } from '../db/schema';

@Injectable()
export class ComponentsService {
  constructor(@Inject(DB) private db: DbType) {}

  // ─── CDN / read-only ────────────────────────────────────────────────────────

  async findAllComponents(
    spaceId: number,
    opts: {
      search?: string;
      in_group?: string;
      is_root?: boolean;
      by_ids?: string;
      sort_by?: string;
    } = {},
  ) {
    const conditions: (SQL | undefined)[] = [eq(components.spaceId, spaceId)];

    if (opts.search?.trim()) {
      conditions.push(ilike(components.name, `%${opts.search.trim()}%`));
    }
    if (opts.in_group !== undefined) {
      conditions.push(
        opts.in_group === '' ? isNull(components.componentGroupUuid) : eq(components.componentGroupUuid, opts.in_group),
      );
    }
    if (opts.is_root !== undefined) {
      conditions.push(eq(components.isRoot, opts.is_root));
    }
    if (opts.by_ids) {
      const ids = opts.by_ids
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => BigInt(s));
      if (ids.length > 0) conditions.push(inArray(components.id, ids));
    }

    let order: ReturnType<typeof asc>;
    if (opts.sort_by === 'updated_at') order = desc(components.updatedAt) as any;
    else if (opts.sort_by === 'is_nestable') order = desc(components.isNestable) as any;
    else if (opts.sort_by === 'is_root') order = desc(components.isRoot) as any;
    else order = asc(components.name);

    const [rows, groupRows] = await Promise.all([
      this.db
        .select()
        .from(components)
        .where(and(...conditions))
        .orderBy(order),
      this.db.select().from(componentGroups).where(eq(componentGroups.spaceId, spaceId)).orderBy(asc(componentGroups.name)),
    ]);

    return {
      components: rows.map((c) => this.formatComponent(c)),
      component_groups: groupRows.map((g) => this.formatGroup(g)),
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
      component_groups: rows.map((g) => this.formatGroup(g)),
    };
  }

  async findOneComponentGroup(spaceId: number, id: number) {
    const [row] = await this.db
      .select()
      .from(componentGroups)
      .where(and(eq(componentGroups.id, BigInt(id)), eq(componentGroups.spaceId, spaceId)))
      .limit(1);

    if (!row) return null;
    return { component_group: this.formatGroup(row) };
  }

  // ─── Admin: list with pagination ────────────────────────────────────────────

  async listComponents(
    spaceId: number,
    opts: {
      page?: number;
      perPage?: number;
      search?: string;
      sortField?: string;
      sortDir?: 'asc' | 'desc';
      groupUuid?: string | null;
    } = {},
  ) {
    const { page = 1, perPage = 25, search, sortField = 'name', sortDir = 'asc', groupUuid } = opts;

    const conditions: (SQL | undefined)[] = [
      eq(components.spaceId, spaceId),
      search?.trim() ? ilike(components.name, `%${search.trim()}%`) : undefined,
      groupUuid !== undefined
        ? groupUuid === null
          ? isNull(components.componentGroupUuid)
          : eq(components.componentGroupUuid, groupUuid)
        : undefined,
    ];

    const where = and(...conditions);

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(components)
      .where(where);

    const orderCol =
      sortField === 'created_at'
        ? components.createdAt
        : sortField === 'updated_at'
          ? components.updatedAt
          : components.name;
    const order = sortDir === 'desc' ? desc(orderCol) : asc(orderCol);

    const rows = await this.db
      .select()
      .from(components)
      .where(where)
      .orderBy(order)
      .limit(perPage)
      .offset((page - 1) * perPage);

    return {
      components: rows.map((c) => this.formatComponent(c)),
      total,
    };
  }

  // ─── Admin: component CRUD ───────────────────────────────────────────────────

  async createComponent(
    spaceId: number,
    data: {
      name: string;
      display_name?: string | null;
      description?: string | null;
      schema?: any;
      is_root?: boolean;
      is_nestable?: boolean;
      component_group_uuid?: string | null;
      image?: string | null;
      color?: string | null;
      icon?: string | null;
    },
  ) {
    const id = BigInt(Date.now() * 1000 + Math.floor(Math.random() * 1000));
    const [row] = await this.db
      .insert(components)
      .values({
        id,
        spaceId,
        name: data.name,
        displayName: data.display_name ?? null,
        description: data.description ?? null,
        schema: data.schema ?? {},
        isRoot: data.is_root ?? false,
        isNestable: data.is_nestable ?? true,
        componentGroupUuid: data.component_group_uuid ?? null,
        image: data.image ?? null,
        color: data.color ?? null,
        icon: data.icon ?? null,
      })
      .returning();
    return { component: this.formatComponent(row) };
  }

  async updateComponent(
    spaceId: number,
    id: number,
    data: {
      name?: string;
      display_name?: string | null;
      description?: string | null;
      schema?: any;
      is_root?: boolean;
      is_nestable?: boolean;
      component_group_uuid?: string | null;
      image?: string | null;
      color?: string | null;
      icon?: string | null;
      preview_field?: string | null;
      preview_tmpl?: string | null;
      internal_tags_list?: { id: string | number; name: string }[];
    },
  ) {
    const set: Record<string, any> = { updatedAt: new Date() };
    if (data.name !== undefined) set.name = data.name;
    if (data.display_name !== undefined) set.displayName = data.display_name;
    if (data.description !== undefined) set.description = data.description;
    if (data.schema !== undefined) set.schema = data.schema;
    if (data.is_root !== undefined) set.isRoot = data.is_root;
    if (data.is_nestable !== undefined) set.isNestable = data.is_nestable;
    if ('component_group_uuid' in data) set.componentGroupUuid = data.component_group_uuid;
    if ('image' in data) set.image = data.image;
    if ('color' in data) set.color = data.color;
    if ('icon' in data) set.icon = data.icon;
    if ('preview_field' in data) set.previewField = data.preview_field;
    if ('preview_tmpl' in data) set.previewTmpl = data.preview_tmpl;
    if ('internal_tags_list' in data) {
      set.internalTagsList = data.internal_tags_list;
      set.internalTagIds = (data.internal_tags_list ?? []).map((t) => String(t.id));
    }

    const [row] = await this.db
      .update(components)
      .set(set)
      .where(and(eq(components.id, BigInt(id)), eq(components.spaceId, spaceId)))
      .returning();
    if (!row) throw new NotFoundException('Component not found');
    return { component: this.formatComponent(row) };
  }

  async deleteComponent(spaceId: number, id: number) {
    const [row] = await this.db
      .delete(components)
      .where(and(eq(components.id, BigInt(id)), eq(components.spaceId, spaceId)))
      .returning();
    if (!row) throw new NotFoundException('Component not found');
    return { component: this.formatComponent(row) };
  }

  async duplicateComponent(spaceId: number, id: number) {
    const [orig] = await this.db
      .select()
      .from(components)
      .where(and(eq(components.id, BigInt(id)), eq(components.spaceId, spaceId)))
      .limit(1);
    if (!orig) throw new NotFoundException('Component not found');

    const newId = BigInt(Date.now() * 1000 + Math.floor(Math.random() * 1000));
    const [row] = await this.db
      .insert(components)
      .values({
        id: newId,
        spaceId,
        name: `${orig.name}_copy`,
        displayName: orig.displayName ? `Copy of ${orig.displayName}` : null,
        description: orig.description,
        schema: orig.schema,
        isRoot: orig.isRoot,
        isNestable: orig.isNestable,
        componentGroupUuid: orig.componentGroupUuid,
        image: orig.image,
        color: orig.color,
        icon: orig.icon,
      })
      .returning();
    return { component: this.formatComponent(row) };
  }

  // ─── Admin: component group CRUD ────────────────────────────────────────────

  async createComponentGroup(spaceId: number, data: { name: string; parent_uuid?: string | null }) {
    const id = BigInt(Date.now() * 1000 + Math.floor(Math.random() * 1000));
    const uuid = crypto.randomUUID();

    let parentId: bigint | null = null;
    if (data.parent_uuid) {
      const [parent] = await this.db
        .select()
        .from(componentGroups)
        .where(and(eq(componentGroups.uuid, data.parent_uuid), eq(componentGroups.spaceId, spaceId)))
        .limit(1);
      if (parent) parentId = parent.id;
    }

    const [row] = await this.db
      .insert(componentGroups)
      .values({
        id,
        uuid,
        spaceId,
        name: data.name,
        parentId,
        parentUuid: data.parent_uuid ?? null,
      })
      .returning();
    return this.formatGroup(row);
  }

  async updateComponentGroup(spaceId: number, id: number, data: { name?: string }) {
    const set: Record<string, any> = {};
    if (data.name !== undefined) set.name = data.name;

    const [row] = await this.db
      .update(componentGroups)
      .set(set)
      .where(and(eq(componentGroups.id, BigInt(id)), eq(componentGroups.spaceId, spaceId)))
      .returning();
    if (!row) throw new NotFoundException('Group not found');
    return this.formatGroup(row);
  }

  async deleteComponentGroup(spaceId: number, id: number) {
    const [row] = await this.db
      .delete(componentGroups)
      .where(and(eq(componentGroups.id, BigInt(id)), eq(componentGroups.spaceId, spaceId)))
      .returning();
    if (!row) throw new NotFoundException('Group not found');
    return this.formatGroup(row);
  }

  // ─── Formatters ─────────────────────────────────────────────────────────────

  private formatGroup(g: typeof componentGroups.$inferSelect) {
    return {
      id: Number(g.id),
      uuid: g.uuid,
      name: g.name,
      parent_id: g.parentId ? Number(g.parentId) : null,
      parent_uuid: g.parentUuid ?? null,
    };
  }

  private formatComponent(c: typeof components.$inferSelect) {
    return {
      id: Number(c.id),
      name: c.name,
      real_name: c.name,
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
      preset_id: null,
      component_group_uuid: c.componentGroupUuid ?? null,
      color: c.color ?? null,
      icon: c.icon ?? null,
      internal_tags_list: c.internalTagsList,
      internal_tag_ids: c.internalTagIds,
      content_type_asset_preview: c.contentTypeAssetPreview ?? null,
      metadata: {},
    };
  }
}
