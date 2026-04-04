import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, ilike, inArray } from 'drizzle-orm';
import { escapeLike } from '../shared/query-parser.util';
import { DB } from '../db/db.module';
import { DbType } from '../db/db.module';
import { spaceMembers, spaceRoles } from '../db/schema';

@Injectable()
export class SpaceRolesService {
  constructor(@Inject(DB) private db: DbType) {}

  async findAll(spaceId: number) {
    const rows = await this.db
      .select()
      .from(spaceRoles)
      .where(eq(spaceRoles.spaceId, spaceId))
      .orderBy(asc(spaceRoles.id));

    return { space_roles: rows.map((r) => this.format(r)) };
  }

  async findOne(spaceId: number, id: number) {
    const [row] = await this.db
      .select()
      .from(spaceRoles)
      .where(eq(spaceRoles.id, BigInt(id)))
      .limit(1);

    if (!row || row.spaceId !== spaceId) return null;
    return { space_role: this.format(row) };
  }

  // ─── Admin methods ────────────────────────────────────────────────────────

  async adminList(spaceId: number, filters?: { search?: string; by_ids?: string }) {
    const conditions = [eq(spaceRoles.spaceId, spaceId)];

    if (filters?.search) {
      conditions.push(ilike(spaceRoles.role, `%${escapeLike(filters.search)}%`));
    }

    if (filters?.by_ids) {
      const ids = filters.by_ids
        .split(',')
        .slice(0, 1000)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => BigInt(s));
      if (ids.length > 0) {
        conditions.push(inArray(spaceRoles.id, ids));
      }
    }

    const rows = await this.db
      .select()
      .from(spaceRoles)
      .where(and(...conditions))
      .orderBy(asc(spaceRoles.id));

    const members = await this.db
      .select()
      .from(spaceMembers)
      .where(eq(spaceMembers.spaceId, spaceId));

    const adminCount = members.filter((m) => m.role === 'admin').length;
    const editorCount = members.filter((m) => m.role === 'editor').length;

    const customRoles = rows.map((r) => {
      const roleIdNum = Number(r.id);
      const userCount = members.filter(
        (m) =>
          (m.spaceRoleId !== null && Number(m.spaceRoleId) === roleIdNum) ||
          (Array.isArray(m.spaceRoleIds) && (m.spaceRoleIds as number[]).includes(roleIdNum)),
      ).length;
      return { ...this.format(r), user_count: userCount };
    });

    return {
      default_roles: [
        {
          id: null,
          role: 'Admin',
          subtitle: 'Can manage users and create, update projects.',
          is_default: true,
          user_count: adminCount,
        },
        {
          id: null,
          role: 'Editor',
          subtitle: 'Can create, update and delete content.',
          is_default: true,
          user_count: editorCount,
        },
      ],
      space_roles: customRoles,
    };
  }

  async adminFindOne(spaceId: number, id: number) {
    const [row] = await this.db
      .select()
      .from(spaceRoles)
      .where(eq(spaceRoles.id, BigInt(id)))
      .limit(1);

    if (!row || row.spaceId !== spaceId) return null;

    const members = await this.db
      .select()
      .from(spaceMembers)
      .where(eq(spaceMembers.spaceId, spaceId));

    const userCount = members.filter(
      (m) =>
        (m.spaceRoleId !== null && Number(m.spaceRoleId) === id) ||
        (Array.isArray(m.spaceRoleIds) && (m.spaceRoleIds as number[]).includes(id)),
    ).length;

    return { space_role: { ...this.format(row), user_count: userCount } };
  }

  async create(spaceId: number, body: any) {
    const id = BigInt(Date.now());
    await this.db.insert(spaceRoles).values({
      id,
      spaceId,
      role: body.role ?? '',
      subtitle: body.subtitle ?? null,
      extId: body.ext_id ?? null,
      permissions: body.permissions ?? [],
      allowedPaths: body.allowed_paths ?? [],
      blockedPaths: body.blocked_paths ?? [],
      fieldPermissions: body.field_permissions ?? [],
      allowedFieldPermissions: body.allowed_field_permissions ?? [],
      readonlyFieldPermissions: body.readonly_field_permissions ?? [],
      datasourceIds: body.datasource_ids ?? [],
      blockedDatasourceIds: body.blocked_datasource_ids ?? [],
      componentIds: body.component_ids ?? [],
      allowedComponentIds: body.allowed_component_ids ?? [],
      managedComponentIds: body.managed_component_ids ?? [],
      blockedManageComponentIds: body.blocked_manage_component_ids ?? [],
      managedComponentGroupUuids: body.managed_component_group_uuids ?? [],
      blockedManageComponentGroupUuids: body.blocked_manage_component_group_uuids ?? [],
      componentGroupUuids: body.component_group_uuids ?? [],
      blockedComponentGroupUuids: body.blocked_component_group_uuids ?? [],
      branchIds: body.branch_ids ?? [],
      blockedBranchIds: body.blocked_branch_ids ?? [],
      allowedLanguages: body.allowed_languages ?? [],
      blockedLanguages: body.blocked_languages ?? [],
      assetFolderIds: body.asset_folder_ids ?? [],
      blockedAssetFolderIds: body.blocked_asset_folder_ids ?? [],
    });

    const [row] = await this.db.select().from(spaceRoles).where(eq(spaceRoles.id, id)).limit(1);

    return { space_role: { ...this.format(row), user_count: 0 } };
  }

  async update(spaceId: number, id: number, body: any) {
    const [existing] = await this.db
      .select()
      .from(spaceRoles)
      .where(eq(spaceRoles.id, BigInt(id)))
      .limit(1);

    if (!existing || existing.spaceId !== spaceId) return null;

    const updates: Partial<typeof spaceRoles.$inferInsert> = {};
    if (body.role !== undefined) updates.role = body.role;
    if (body.subtitle !== undefined) updates.subtitle = body.subtitle;
    if (body.ext_id !== undefined) updates.extId = body.ext_id;
    if (body.permissions !== undefined) updates.permissions = body.permissions;
    if (body.allowed_paths !== undefined) updates.allowedPaths = body.allowed_paths;
    if (body.blocked_paths !== undefined) updates.blockedPaths = body.blocked_paths;
    if (body.field_permissions !== undefined) updates.fieldPermissions = body.field_permissions;
    if (body.allowed_field_permissions !== undefined)
      updates.allowedFieldPermissions = body.allowed_field_permissions;
    if (body.readonly_field_permissions !== undefined)
      updates.readonlyFieldPermissions = body.readonly_field_permissions;
    if (body.datasource_ids !== undefined) updates.datasourceIds = body.datasource_ids;
    if (body.blocked_datasource_ids !== undefined)
      updates.blockedDatasourceIds = body.blocked_datasource_ids;
    if (body.component_ids !== undefined) updates.componentIds = body.component_ids;
    if (body.allowed_component_ids !== undefined)
      updates.allowedComponentIds = body.allowed_component_ids;
    if (body.managed_component_ids !== undefined)
      updates.managedComponentIds = body.managed_component_ids;
    if (body.blocked_manage_component_ids !== undefined)
      updates.blockedManageComponentIds = body.blocked_manage_component_ids;
    if (body.managed_component_group_uuids !== undefined)
      updates.managedComponentGroupUuids = body.managed_component_group_uuids;
    if (body.blocked_manage_component_group_uuids !== undefined)
      updates.blockedManageComponentGroupUuids = body.blocked_manage_component_group_uuids;
    if (body.component_group_uuids !== undefined)
      updates.componentGroupUuids = body.component_group_uuids;
    if (body.blocked_component_group_uuids !== undefined)
      updates.blockedComponentGroupUuids = body.blocked_component_group_uuids;
    if (body.branch_ids !== undefined) updates.branchIds = body.branch_ids;
    if (body.blocked_branch_ids !== undefined) updates.blockedBranchIds = body.blocked_branch_ids;
    if (body.allowed_languages !== undefined) updates.allowedLanguages = body.allowed_languages;
    if (body.blocked_languages !== undefined) updates.blockedLanguages = body.blocked_languages;
    if (body.asset_folder_ids !== undefined) updates.assetFolderIds = body.asset_folder_ids;
    if (body.blocked_asset_folder_ids !== undefined)
      updates.blockedAssetFolderIds = body.blocked_asset_folder_ids;

    if (Object.keys(updates).length > 0) {
      await this.db
        .update(spaceRoles)
        .set(updates)
        .where(eq(spaceRoles.id, BigInt(id)));
    }

    return this.adminFindOne(spaceId, id);
  }

  async remove(spaceId: number, id: number) {
    const [existing] = await this.db
      .select()
      .from(spaceRoles)
      .where(eq(spaceRoles.id, BigInt(id)))
      .limit(1);

    if (!existing || existing.spaceId !== spaceId) return null;

    await this.db.delete(spaceRoles).where(eq(spaceRoles.id, BigInt(id)));
    return { space_role: this.format(existing) };
  }

  // ─── Format ───────────────────────────────────────────────────────────────

  private format(r: typeof spaceRoles.$inferSelect) {
    return {
      id: Number(r.id),
      role: r.role,
      subtitle: r.subtitle ?? null,
      ext_id: r.extId ?? null,
      permissions: r.permissions,
      allowed_paths: r.allowedPaths,
      blocked_paths: r.blockedPaths,
      resolved_allowed_paths: r.allowedPaths,
      resolved_blocked_paths: r.blockedPaths,
      field_permissions: r.fieldPermissions,
      allowed_field_permissions: r.allowedFieldPermissions,
      readonly_field_permissions: r.readonlyFieldPermissions,
      datasource_ids: r.datasourceIds,
      blocked_datasource_ids: r.blockedDatasourceIds,
      component_ids: r.componentIds,
      allowed_component_ids: r.allowedComponentIds,
      branch_ids: r.branchIds,
      blocked_branch_ids: r.blockedBranchIds,
      allowed_languages: r.allowedLanguages,
      blocked_languages: r.blockedLanguages,
      asset_folder_ids: r.assetFolderIds,
      blocked_asset_folder_ids: r.blockedAssetFolderIds,
      managed_component_ids: r.managedComponentIds,
      blocked_manage_component_ids: r.blockedManageComponentIds,
      managed_component_group_uuids: r.managedComponentGroupUuids,
      blocked_manage_component_group_uuids: r.blockedManageComponentGroupUuids,
      component_group_uuids: r.componentGroupUuids,
      blocked_component_group_uuids: r.blockedComponentGroupUuids,
    };
  }
}
