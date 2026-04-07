'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Lock, Check } from 'lucide-react';
import { PermissionGrid } from '@/components/spaces/permission-grid';
import { PermissionSelector } from './permission-selector';
import type { SelectOption } from './permission-selector';
import { TagInput } from './tag-input';

type PermTab = 'general' | 'content' | 'blocks' | 'datasources' | 'assets';

interface PermissionMatrixProps {
  permissions: string[];
  onPermissionsChange: (p: string[]) => void;
  languageMode: 'allowed' | 'blocked';
  onLanguageModeChange: (m: 'allowed' | 'blocked') => void;
  allowedLanguages: string[];
  onAllowedLanguagesChange: (tags: string[]) => void;
  blockedLanguages: string[];
  onBlockedLanguagesChange: (tags: string[]) => void;
  allowedPaths: number[];
  onAllowedPathsChange: (paths: number[]) => void;
  blockedPaths: number[];
  onBlockedPathsChange: (paths: number[]) => void;
  pathMode: 'allowed' | 'blocked';
  restrictAccess: boolean;
  onRestrictAccessChange: (v: boolean) => void;
  grantBlockLibrary: boolean;
  onGrantBlockLibraryChange: (v: boolean) => void;
  datasourceMode: 'allowed' | 'blocked';
  onDatasourceModeChange: (m: 'allowed' | 'blocked') => void;
  datasourceIds: number[];
  onDatasourceIdsChange: (ids: number[]) => void;
  blockedDatasourceIds: number[];
  onBlockedDatasourceIdsChange: (ids: number[]) => void;
  dsOptions: SelectOption[];
  assetMode: 'allowed' | 'blocked';
  onAssetModeChange: (m: 'allowed' | 'blocked') => void;
  assetFolderIds: number[];
  onAssetFolderIdsChange: (ids: number[]) => void;
  blockedAssetFolderIds: number[];
  onBlockedAssetFolderIdsChange: (ids: number[]) => void;
  folderOptions: SelectOption[];
  hideAssets: boolean;
  onHideAssetsChange: (v: boolean) => void;
}

const PERM_TABS: { key: PermTab; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'content', label: 'Content' },
  { key: 'blocks', label: 'Blocks' },
  { key: 'datasources', label: 'Datasources' },
  { key: 'assets', label: 'Assets' },
];

export function PermissionMatrix(props: PermissionMatrixProps) {
  const [permTab, setPermTab] = useState<PermTab>('general');

  const activeLangTags =
    props.languageMode === 'allowed' ? props.allowedLanguages : props.blockedLanguages;
  const setLangTags = (tags: string[]) =>
    props.languageMode === 'allowed'
      ? props.onAllowedLanguagesChange(tags)
      : props.onBlockedLanguagesChange(tags);

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Permissions</h3>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 gap-0">
        {PERM_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setPermTab(tab.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              permTab === tab.key
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* General tab */}
      {permTab === 'general' && (
        <PermissionGrid
          permissions={props.permissions}
          onPermissionsChange={props.onPermissionsChange}
        />
      )}

      {/* Content tab */}
      {permTab === 'content' && (
        <div className="space-y-6">
          {/* Languages */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Languages
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Add languages the user should have access to. If no item is selected the user has
              rights to edit all content.
            </p>
            <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-visible min-h-[44px]">
              {/* Mode */}
              <LanguageModeToggle
                mode={props.languageMode}
                onChange={(m) => {
                  props.onLanguageModeChange(m);
                  props.onAllowedLanguagesChange([]);
                  props.onBlockedLanguagesChange([]);
                }}
              />
              <div className="flex-1 px-3 py-2">
                <TagInput
                  tags={activeLangTags}
                  onChange={setLangTags}
                  placeholder="Add language code (e.g. en, sk)..."
                />
              </div>
            </div>
          </div>

          {/* Folder/Content item permissions */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Folder/Content item permissions
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Add folders or content items the user should have access to. If no item is selected,
              all content will be editable by the user.
            </p>
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {props.pathMode === 'allowed'
                    ? props.allowedPaths.length === 0
                      ? 'All content (no restrictions)'
                      : `${props.allowedPaths.length} allowed path${props.allowedPaths.length !== 1 ? 's' : ''}`
                    : props.blockedPaths.length === 0
                      ? 'No blocked paths'
                      : `${props.blockedPaths.length} blocked path${props.blockedPaths.length !== 1 ? 's' : ''}`}
                </span>
                {(props.allowedPaths.length > 0 || props.blockedPaths.length > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      props.onAllowedPathsChange([]);
                      props.onBlockedPathsChange([]);
                    }}
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Folder/story path management is configured via the content browser.
              </p>
            </div>

            {/* Restrict access checkbox */}
            <label className="flex items-start gap-3 mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={props.restrictAccess}
                onChange={(e) => props.onRestrictAccessChange(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500 shrink-0"
              />
              <div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Restrict access when roles conflict with overlapping permissions.
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  When this option is enabled, the restriction overrides rules with allowed
                  folders/stories.
                </p>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Blocks tab */}
      {permTab === 'blocks' && (
        <div className="space-y-6">
          {/* Grant access toggle */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Grant access to the Block library
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Users associated with this role can create, move, and edit blocks.
              </p>
            </div>
            <Toggle checked={props.grantBlockLibrary} onChange={props.onGrantBlockLibraryChange} />
          </div>

          {props.grantBlockLibrary && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
              <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Library access management
              </h5>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                If no item is selected, the user has access to all blocks and folders.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Block-level access management is configured via the Block Library.
              </p>
            </div>
          )}

          {/* Manage block access in editor */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Manage block access in the editor
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Block and field access management in the story editor requires block library
              configuration.
            </p>
          </div>
        </div>
      )}

      {/* Datasources tab */}
      {permTab === 'datasources' && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Datasource permissions
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Add datasources the user should have access to. If no item is selected the user has
            rights to edit all datasources.
          </p>
          <PermissionSelector
            mode={props.datasourceMode}
            onModeChange={(m) => {
              props.onDatasourceModeChange(m);
              props.onDatasourceIdsChange([]);
              props.onBlockedDatasourceIdsChange([]);
            }}
            selectedIds={
              props.datasourceMode === 'allowed' ? props.datasourceIds : props.blockedDatasourceIds
            }
            onSelectedChange={(ids) =>
              props.datasourceMode === 'allowed'
                ? props.onDatasourceIdsChange(ids)
                : props.onBlockedDatasourceIdsChange(ids)
            }
            options={props.dsOptions}
            allLabel="All datasources"
            searchPlaceholder="Search datasources..."
          />
        </div>
      )}

      {/* Assets tab */}
      {permTab === 'assets' && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Asset Folder Permissions
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Manage access to selected asset folders for this role. You can grant or restrict
              access by specifying allowed and blocked folders.
            </p>
            <PermissionSelector
              mode={props.assetMode}
              onModeChange={(m) => {
                props.onAssetModeChange(m);
                props.onAssetFolderIdsChange([]);
                props.onBlockedAssetFolderIdsChange([]);
              }}
              selectedIds={
                props.assetMode === 'allowed' ? props.assetFolderIds : props.blockedAssetFolderIds
              }
              onSelectedChange={(ids) =>
                props.assetMode === 'allowed'
                  ? props.onAssetFolderIdsChange(ids)
                  : props.onBlockedAssetFolderIdsChange(ids)
              }
              options={props.folderOptions}
              allLabel="Search for asset folders"
              searchPlaceholder="Search folders..."
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={props.hideAssets}
              onChange={(e) => props.onHideAssetsChange(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500 shrink-0"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Hide assets and assets folders (including their subfolders) the role doesn&apos;t have
              permission to upload to
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${checked ? 'bg-teal-600' : 'bg-gray-200 dark:bg-gray-700'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
}

function LanguageModeToggle({
  mode,
  onChange,
}: {
  mode: 'allowed' | 'blocked';
  onChange: (m: 'allowed' | 'blocked') => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 h-full text-sm text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 whitespace-nowrap"
      >
        <Lock className="w-3.5 h-3.5" />
        {mode === 'allowed' ? 'Allowed items' : 'Blocked items'}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          {(['allowed', 'blocked'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                onChange(m);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 ${mode === m ? 'text-teal-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
            >
              {mode === m && <Check className="w-3.5 h-3.5" />}
              {m === 'allowed' ? 'Allowed items' : 'Blocked items'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
