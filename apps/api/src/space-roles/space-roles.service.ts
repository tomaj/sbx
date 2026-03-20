import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { spaceRoles } from '../db/schema';

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
      resolved_blocked_paths: null,
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
