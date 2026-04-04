'use client';

import { useState } from 'react';
import { X, Search, LayoutGrid, List, Check, Images } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';
import { FolderTree, type AssetFolder } from '@/components/assets/folder-tree';
import { AssetThumb } from '@/components/assets/asset-thumb';
import type { Asset } from '@/components/assets/asset-grid';
import { useApi } from '@/lib/swr';

const SORT_OPTIONS = [
  { value: 'created_at_desc', label: 'Default' },
  { value: 'filename_asc', label: 'Name (asc)' },
  { value: 'filename_desc', label: 'Name (desc)' },
  { value: 'updated_at_desc', label: 'Update Date (desc)' },
];

function parseSortOption(sort: string): { field: string; dir: string } {
  const lastUnderscore = sort.lastIndexOf('_');
  return { field: sort.slice(0, lastUnderscore), dir: sort.slice(lastUnderscore + 1) };
}

interface AssetPickerModalProps {
  spaceId: string;
  /** 'single' = pick one and auto-confirm; 'multi' = pick many, confirm button */
  mode: 'single' | 'multi';
  onSelect: (assets: Asset[]) => void;
  onClose: () => void;
}

export function AssetPickerModal({ spaceId, mode, onSelect, onClose }: AssetPickerModalProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFolder, setSelectedFolder] = useState<number | null | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('created_at_desc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(24);
  const [folderSearch, setFolderSearch] = useState('');
  const [selected, setSelected] = useState<Asset[]>([]);

  // Static fetches
  const { data: foldersData } = useApi<{ asset_folders: AssetFolder[] }>(
    `/api/admin/spaces/${spaceId}/assets/folders`,
  );
  const { data: countsData } = useApi<{ total: number }>(
    `/api/admin/spaces/${spaceId}/assets/counts`,
  );
  const folders = foldersData?.asset_folders ?? [];
  const totalCount = countsData?.total ?? 0;

  // Dynamic assets fetch — key changes on any filter/page change
  const assetsQs = new URLSearchParams();
  assetsQs.set('page', String(page));
  assetsQs.set('per_page', String(perPage));
  if (search.trim()) assetsQs.set('search', search.trim());
  if (selectedFolder !== undefined) {
    assetsQs.set('folder_id', selectedFolder === null ? 'null' : String(selectedFolder));
  }
  const { field, dir } = parseSortOption(sort);
  assetsQs.set('sort_field', field);
  assetsQs.set('sort_dir', dir);
  const { data: assetsData, isLoading } = useApi<{ assets: Asset[]; total: number }>(
    `/api/admin/spaces/${spaceId}/assets?${assetsQs}`,
  );
  const assets = assetsData?.assets ?? [];
  const total = assetsData?.total ?? 0;

  function toggleAsset(asset: Asset) {
    if (mode === 'single') {
      onSelect([asset]);
      onClose();
      return;
    }
    setSelected((prev) => {
      const exists = prev.find((a) => a.id === asset.id);
      return exists ? prev.filter((a) => a.id !== asset.id) : [...prev, asset];
    });
  }

  function isSelected(asset: Asset) {
    return selected.some((a) => a.id === asset.id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
        style={{ maxHeight: 'calc(100vh - 24px)', maxWidth: 'calc(100vw - 24px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Assets</h2>
          <div className="flex items-center gap-3">
            {mode === 'multi' && selected.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onSelect(selected);
                  onClose();
                }}
                className="px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Select {selected.length}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left sidebar */}
          <div className="w-60 shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-y-auto py-4 px-3 gap-1">
            <button
              type="button"
              onClick={() => setSelectedFolder(undefined)}
              className={`flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors ${
                selectedFolder === undefined
                  ? 'text-teal-700 dark:text-teal-300 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <Images className="w-4 h-4 text-gray-400" />
                All Assets
              </span>
              <span className="text-xs text-gray-400">{totalCount}</span>
            </button>

            <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
            <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Folders
            </p>

            <div className="relative mb-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={folderSearch}
                onChange={(e) => setFolderSearch(e.target.value)}
                placeholder="Search folders..."
                className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <FolderTree
              folders={folders}
              selectedId={selectedFolder !== undefined ? selectedFolder : -1}
              onSelect={(id) => setSelectedFolder(id ?? undefined)}
              search={folderSearch}
              onCreateFolder={() => {}}
              onRenameFolder={() => {}}
              onMoveFolder={() => {}}
              onDeleteFolder={() => {}}
            />
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Toolbar */}
            <div className="px-5 pt-4 pb-3 flex items-center gap-3 flex-shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Assets */}
            <div className="flex-1 overflow-y-auto px-5 pb-2">
              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-2">
                      <div className="aspect-[4/3] rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-3/4" />
                    </div>
                  ))}
                </div>
              ) : assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <p className="text-sm">No assets found</p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {assets.map((asset) => {
                    const sel = isSelected(asset);
                    return (
                      <div
                        key={asset.id}
                        className="flex flex-col gap-1.5 cursor-pointer"
                        onClick={() => toggleAsset(asset)}
                      >
                        <div
                          className={`relative aspect-[4/3] rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center p-2.5 transition-all ${sel ? 'ring-2 ring-teal-500' : 'hover:ring-2 hover:ring-teal-400'}`}
                        >
                          <AssetThumb
                            filename={asset.filename}
                            contentType={asset.content_type}
                            spaceId={spaceId}
                            alt={asset.alt}
                            size={300}
                            imgClassName="max-w-full max-h-full w-auto h-auto object-contain"
                            iconClassName="w-10 h-10 text-gray-400"
                          />
                          {sel && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center shadow">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300 truncate font-medium leading-snug">
                          {asset.short_filename || asset.filename.split('/').pop()}
                        </p>
                        <p className="text-[10px] text-gray-400 leading-none">
                          .{asset.content_type.split('/')[1] ?? asset.content_type}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col">
                  {assets.map((asset) => {
                    const sel = isSelected(asset);
                    return (
                      <div
                        key={asset.id}
                        className={`flex items-center gap-3 py-2 px-2 rounded-lg cursor-pointer transition-colors ${sel ? 'bg-teal-50 dark:bg-teal-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                        onClick={() => toggleAsset(asset)}
                      >
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          <AssetThumb
                            filename={asset.filename}
                            contentType={asset.content_type}
                            spaceId={spaceId}
                            alt={asset.alt}
                            size={80}
                            imgClassName="max-w-full max-h-full w-auto h-auto object-contain"
                            iconClassName="w-5 h-5 text-gray-400"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 dark:text-gray-200 truncate font-medium">
                            {asset.short_filename || asset.filename.split('/').pop()}
                          </p>
                          <p className="text-xs text-gray-400">{asset.content_type}</p>
                        </div>
                        {sel && <Check className="w-4 h-4 text-teal-500 flex-shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            <Pagination
              total={total}
              page={page}
              perPage={perPage}
              onPageChange={setPage}
              onPerPageChange={(n) => {
                setPerPage(n);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
