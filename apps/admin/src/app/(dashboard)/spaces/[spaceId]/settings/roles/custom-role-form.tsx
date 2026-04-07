'use client';

import { useState, useEffect } from 'react';
import { CrudSidebarForm } from '@/components/ui/crud-sidebar-form';
import { FormField, inputCls } from '@/components/ui/form-field';
import { useApi } from '@/lib/swr';
import type { SpaceRole, Datasource, AssetFolder } from '@sbx/types';
import { PermissionMatrix } from './permission-matrix';
import type { SelectOption } from './permission-selector';

interface FormState {
  name: string;
  subtitle: string;
  permissions: string[];
  allowedLanguages: string[];
  blockedLanguages: string[];
  languageMode: 'allowed' | 'blocked';
  allowedPaths: number[];
  blockedPaths: number[];
  pathMode: 'allowed' | 'blocked';
  restrictAccess: boolean;
  datasourceIds: number[];
  blockedDatasourceIds: number[];
  datasourceMode: 'allowed' | 'blocked';
  assetFolderIds: number[];
  blockedAssetFolderIds: number[];
  assetMode: 'allowed' | 'blocked';
  hideAssets: boolean;
  grantBlockLibrary: boolean;
}

interface CustomRoleFormProps {
  spaceId: string;
  role: SpaceRole | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function CustomRoleForm({ spaceId, role, open, onClose, onSaved }: CustomRoleFormProps) {
  const [form, setForm] = useState<FormState>({
    name: '',
    subtitle: '',
    permissions: ['read_stories'],
    allowedLanguages: [],
    blockedLanguages: [],
    languageMode: 'allowed',
    allowedPaths: [],
    blockedPaths: [],
    pathMode: 'allowed',
    restrictAccess: false,
    datasourceIds: [],
    blockedDatasourceIds: [],
    datasourceMode: 'allowed',
    assetFolderIds: [],
    blockedAssetFolderIds: [],
    assetMode: 'allowed',
    hideAssets: false,
    grantBlockLibrary: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const { data: datasourcesData } = useApi<{ datasources: Datasource[] }>(
    open ? `/api/admin/spaces/${spaceId}/datasources` : null,
  );
  const { data: assetFoldersData } = useApi<{ asset_folders: AssetFolder[] }>(
    open ? `/api/admin/spaces/${spaceId}/assets/folders` : null,
  );
  const datasources = datasourcesData?.datasources ?? [];
  const assetFolders = assetFoldersData?.asset_folders ?? [];

  useEffect(() => {
    if (!open) return;
    const perms = role?.permissions ?? ['read_stories'];
    setForm({
      name: role?.role ?? '',
      subtitle: role?.subtitle ?? '',
      permissions: perms,
      allowedLanguages: role?.allowed_languages ?? [],
      blockedLanguages: role?.blocked_languages ?? [],
      languageMode: (role?.blocked_languages?.length ?? 0) > 0 ? 'blocked' : 'allowed',
      allowedPaths: role?.allowed_paths ?? [],
      blockedPaths: role?.blocked_paths ?? [],
      pathMode: (role?.blocked_paths?.length ?? 0) > 0 ? 'blocked' : 'allowed',
      restrictAccess: perms.includes('prioritize_content_access_restriction'),
      datasourceIds: role?.datasource_ids ?? [],
      blockedDatasourceIds: role?.blocked_datasource_ids ?? [],
      datasourceMode: (role?.blocked_datasource_ids?.length ?? 0) > 0 ? 'blocked' : 'allowed',
      assetFolderIds: role?.asset_folder_ids ?? [],
      blockedAssetFolderIds: role?.blocked_asset_folder_ids ?? [],
      assetMode: (role?.blocked_asset_folder_ids?.length ?? 0) > 0 ? 'blocked' : 'allowed',
      hideAssets: perms.includes('hide_assets'),
      grantBlockLibrary: perms.includes('manage_components'),
    });
    setError(null);
    setIsDirty(false);
  }, [role, open]);

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
    setIsDirty(true);
  }

  function buildPayload() {
    let perms = form.permissions.filter(
      (p) =>
        p !== 'prioritize_content_access_restriction' &&
        p !== 'hide_assets' &&
        p !== 'manage_components',
    );
    if (form.restrictAccess) perms = [...perms, 'prioritize_content_access_restriction'];
    if (form.hideAssets) perms = [...perms, 'hide_assets'];
    if (form.grantBlockLibrary) perms = [...perms, 'manage_components'];

    return {
      role: form.name.trim(),
      subtitle: form.subtitle.trim() || null,
      permissions: perms,
      allowed_languages: form.languageMode === 'allowed' ? form.allowedLanguages : [],
      blocked_languages: form.languageMode === 'blocked' ? form.blockedLanguages : [],
      allowed_paths: form.pathMode === 'allowed' ? form.allowedPaths : [],
      blocked_paths: form.pathMode === 'blocked' ? form.blockedPaths : [],
      datasource_ids: form.datasourceMode === 'allowed' ? form.datasourceIds : [],
      blocked_datasource_ids: form.datasourceMode === 'blocked' ? form.blockedDatasourceIds : [],
      asset_folder_ids: form.assetMode === 'allowed' ? form.assetFolderIds : [],
      blocked_asset_folder_ids: form.assetMode === 'blocked' ? form.blockedAssetFolderIds : [],
    };
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Role name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const url = role
        ? `/api/admin/spaces/${spaceId}/roles/${role.id}`
        : `/api/admin/spaces/${spaceId}/roles`;
      const res = await fetch(url, {
        method: role ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message ?? 'Failed to save');
      }
      setIsDirty(false);
      onSaved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!role) return;
    await fetch(`/api/admin/spaces/${spaceId}/roles/${role.id}`, { method: 'DELETE' });
    onSaved();
  }

  const dsOptions: SelectOption[] = datasources.map((d) => ({ id: d.id, name: d.name }));
  const folderOptions: SelectOption[] = assetFolders.map((f) => ({ id: f.id, name: f.name }));

  return (
    <CrudSidebarForm
      open={open}
      onClose={onClose}
      title={role ? 'Edit Role' : 'New Role'}
      isSubmitting={saving}
      isDirty={isDirty}
      onSubmit={handleSave}
      onDelete={role ? handleDelete : undefined}
      deleteTitle="Delete Role"
      deleteMessage={`Are you sure you want to delete the role "${role?.role ?? ''}"? Users with this role will lose these permissions.`}
      width="w-[600px]"
      noForm
    >
      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {/* Name + Description */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Role name" required>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="My Role"
            className={inputCls}
          />
        </FormField>
        <FormField label="Short Description">
          <input
            type="text"
            value={form.subtitle}
            onChange={(e) => set('subtitle', e.target.value)}
            placeholder="Optional"
            className={inputCls}
          />
        </FormField>
      </div>

      {role && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {role.user_count} user{role.user_count !== 1 ? 's' : ''} with this role
        </p>
      )}

      {/* Permissions */}
      <PermissionMatrix
        permissions={form.permissions}
        onPermissionsChange={(p) => set('permissions', p)}
        languageMode={form.languageMode}
        onLanguageModeChange={(m) => {
          set('languageMode', m);
          set('allowedLanguages', []);
          set('blockedLanguages', []);
        }}
        allowedLanguages={form.allowedLanguages}
        onAllowedLanguagesChange={(tags) => set('allowedLanguages', tags)}
        blockedLanguages={form.blockedLanguages}
        onBlockedLanguagesChange={(tags) => set('blockedLanguages', tags)}
        allowedPaths={form.allowedPaths}
        onAllowedPathsChange={(paths) => set('allowedPaths', paths)}
        blockedPaths={form.blockedPaths}
        onBlockedPathsChange={(paths) => set('blockedPaths', paths)}
        pathMode={form.pathMode}
        restrictAccess={form.restrictAccess}
        onRestrictAccessChange={(v) => set('restrictAccess', v)}
        grantBlockLibrary={form.grantBlockLibrary}
        onGrantBlockLibraryChange={(v) => set('grantBlockLibrary', v)}
        datasourceMode={form.datasourceMode}
        onDatasourceModeChange={(m) => {
          set('datasourceMode', m);
          set('datasourceIds', []);
          set('blockedDatasourceIds', []);
        }}
        datasourceIds={form.datasourceIds}
        onDatasourceIdsChange={(ids) => set('datasourceIds', ids)}
        blockedDatasourceIds={form.blockedDatasourceIds}
        onBlockedDatasourceIdsChange={(ids) => set('blockedDatasourceIds', ids)}
        dsOptions={dsOptions}
        assetMode={form.assetMode}
        onAssetModeChange={(m) => {
          set('assetMode', m);
          set('assetFolderIds', []);
          set('blockedAssetFolderIds', []);
        }}
        assetFolderIds={form.assetFolderIds}
        onAssetFolderIdsChange={(ids) => set('assetFolderIds', ids)}
        blockedAssetFolderIds={form.blockedAssetFolderIds}
        onBlockedAssetFolderIdsChange={(ids) => set('blockedAssetFolderIds', ids)}
        folderOptions={folderOptions}
        hideAssets={form.hideAssets}
        onHideAssetsChange={(v) => set('hideAssets', v)}
      />
    </CrudSidebarForm>
  );
}
