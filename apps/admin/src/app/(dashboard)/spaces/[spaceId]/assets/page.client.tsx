'use client';

import { useState, use } from 'react';
import { usePerPage } from '@/hooks/use-per-page';
import { Trash2, Tag, Folder } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { BulkActionBar } from '@/components/ui/bulk-action-bar';
import type { ActiveFilter } from '@/components/ui/search-filter-bar';
import type { AssetFolder } from '@/components/assets/folder-tree';
import { CreateFolderModal } from '@/components/assets/create-folder-modal';
import { MoveFolderModal } from '@/components/assets/move-folder-modal';
import { AssetGrid, type Asset } from '@/components/assets/asset-grid';
import { AssetList } from '@/components/assets/asset-list';
import { AssetDetailModal } from '@/components/assets/asset-detail';
import { UploadAssetsModal } from '@/components/assets/upload-assets-modal';
import { TagsView, type ComponentInternalTag } from '@/components/block-library/tags-view';
import { RenameModal } from '@/components/ui/rename-modal';
import { SplitPageLayout } from '@/components/ui/split-page-layout';
import { useApi } from '@/lib/swr';
import type { Tag as TagType } from '@sbx/types';
import { useAssetsState } from './use-assets-state';
import { BulkTagModal } from './bulk-tag-modal';
import { AssetsToolbar } from './assets-toolbar';
import { AssetsSidebar } from './assets-sidebar';

function parseSortOption(sort: string): { field: string; dir: string } {
  const lastUnderscore = sort.lastIndexOf('_');
  return {
    field: sort.slice(0, lastUnderscore),
    dir: sort.slice(lastUnderscore + 1),
  };
}

export default function AssetsPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params);

  // ─── Assets state (selection, view mode, bulk tag) ─────────────────────────
  const {
    selectedIds,
    viewMode,
    setViewMode,
    bulkTagOpen,
    setBulkTagOpen,
    bulkTagSaving,
    setBulkTagSaving,
    toggleSelect,
    selectAll,
    clearSelection,
  } = useAssetsState();

  // ─── UI state ──────────────────────────────────────────────────────────────
  const [showDeleted, setShowDeleted] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<number | null | undefined>(undefined);
  // undefined = "All Assets" (no folder filter), null = root (no folder), number = specific folder

  // ─── Search / filter / sort ────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('created_at_desc');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  // ─── Pagination ────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = usePerPage('perPage:assets', 24);

  // ─── Tags view ─────────────────────────────────────────────────────────────
  const [isTagsView, setIsTagsView] = useState(false);

  // ─── Folder sidebar search ─────────────────────────────────────────────────
  const [folderSearch, setFolderSearch] = useState('');

  // ─── Modals ────────────────────────────────────────────────────────────────
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createFolderParentId, setCreateFolderParentId] = useState<number | null>(null);
  const [renameFolder, setRenameFolder] = useState<AssetFolder | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<AssetFolder | null>(null);
  const [moveFolderTarget, setMoveFolderTarget] = useState<AssetFolder | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // ─── Data fetching ────────────────────────────────────────────────────────
  const { data: foldersData, mutate: mutateFolders } = useApi<{ asset_folders: AssetFolder[] }>(
    `/api/admin/spaces/${spaceId}/assets/folders`,
  );
  const folders = foldersData?.asset_folders ?? [];

  const { data: countsData, mutate: mutateCounts } = useApi<{ total: number; deleted: number }>(
    `/api/admin/spaces/${spaceId}/assets/counts`,
  );
  const totalCount = countsData?.total ?? 0;
  const deletedCount = countsData?.deleted ?? 0;

  const {
    data: tagsData,
    isLoading: tagsLoading,
    mutate: mutateTags,
  } = useApi<{
    internal_tags: ComponentInternalTag[];
  }>(`/api/admin/spaces/${spaceId}/internal_tags?by_object_type=asset`);
  const assetTags = tagsData?.internal_tags ?? [];

  // Build assets query URL
  const qs = new URLSearchParams();
  qs.set('page', String(page));
  qs.set('per_page', String(perPage));
  if (search.trim()) qs.set('search', search.trim());
  if (showDeleted) qs.set('deleted', 'true');
  if (selectedFolder !== undefined) {
    qs.set('folder_id', selectedFolder === null ? 'null' : String(selectedFolder));
  }
  const { field, dir } = parseSortOption(sort);
  qs.set('sort_field', field);
  qs.set('sort_dir', dir);
  for (const f of activeFilters) {
    if (!f.value) continue;
    if (f.key === 'content_type') qs.set('content_type', f.value);
  }
  const assetsUrl = !isTagsView ? `/api/admin/spaces/${spaceId}/assets?${qs.toString()}` : null;

  const {
    data: assetsData,
    isLoading,
    mutate: mutateAssets,
  } = useApi<{
    assets: Asset[];
    total: number;
  }>(assetsUrl);
  const assets = assetsData?.assets ?? [];
  const total = assetsData?.total ?? 0;

  // ─── Folder CRUD ──────────────────────────────────────────────────────────

  async function handleCreateFolder(name: string, parentId: number | null) {
    const res = await fetch(`/api/admin/spaces/${spaceId}/assets/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parent_id: parentId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message ?? 'Failed to create folder');
    }
    setCreateFolderOpen(false);
    await mutateFolders();
  }

  async function handleRenameFolder(newName: string) {
    if (!renameFolder) return;
    const res = await fetch(`/api/admin/spaces/${spaceId}/assets/folders/${renameFolder.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      setRenameFolder(null);
      await mutateFolders();
    }
  }

  async function handleDeleteFolder() {
    if (!deleteFolderTarget) return;
    const res = await fetch(
      `/api/admin/spaces/${spaceId}/assets/folders/${deleteFolderTarget.id}`,
      { method: 'DELETE' },
    );
    if (res.ok) {
      if (selectedFolder === deleteFolderTarget.id) setSelectedFolder(undefined);
      setDeleteFolderTarget(null);
      await mutateFolders();
    }
  }

  async function handleMoveFolder(folderId: number | null) {
    if (!moveFolderTarget) return;
    await fetch(`/api/admin/spaces/${spaceId}/assets/folders/${moveFolderTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parent_id: folderId }),
    });
    setMoveFolderTarget(null);
    await mutateFolders();
  }

  // ─── Asset delete/restore ────────────────────────────────────────────────

  async function handleRestoreAsset(asset: Asset) {
    await fetch(`/api/admin/spaces/${spaceId}/assets/${asset.id}/restore`, {
      method: 'POST',
    });
    await mutateAssets();
    await mutateCounts();
  }

  // ─── Bulk operations ─────────────────────────────────────────────────────

  async function handleBulkMove(folderId: number | null) {
    await fetch(`/api/admin/spaces/${spaceId}/assets/bulk_update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selectedIds], asset_folder_id: folderId }),
    });
    setBulkMoveOpen(false);
    clearSelection();
    await mutateAssets();
  }

  async function handleBulkDelete() {
    await fetch(`/api/admin/spaces/${spaceId}/assets/bulk_destroy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selectedIds] }),
    });
    setBulkDeleteOpen(false);
    clearSelection();
    await mutateAssets();
    await mutateCounts();
  }

  async function handleBulkTag(tags: TagType[]) {
    setBulkTagSaving(true);
    try {
      await Promise.all(
        [...selectedIds].map((id) =>
          fetch(`/api/admin/spaces/${spaceId}/assets/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ internal_tag_ids: tags.map((t) => t.id) }),
          }),
        ),
      );
      setBulkTagOpen(false);
      clearSelection();
      await mutateAssets();
    } finally {
      setBulkTagSaving(false);
    }
  }

  // ─── Asset tag CRUD ──────────────────────────────────────────────────────

  async function handleCreateAssetTag(name: string) {
    const res = await fetch(`/api/admin/spaces/${spaceId}/internal_tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, object_type: 'asset' }),
    });
    if (!res.ok) throw new Error('Failed to create tag');
    await mutateTags();
  }

  async function handleRenameAssetTag(tag: ComponentInternalTag, newName: string) {
    const res = await fetch(`/api/admin/spaces/${spaceId}/internal_tags/${tag.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    if (!res.ok) throw new Error('Failed to rename tag');
    await mutateTags();
  }

  async function handleDeleteAssetTag(tag: ComponentInternalTag) {
    const res = await fetch(`/api/admin/spaces/${spaceId}/internal_tags/${tag.id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete tag');
    await mutateTags();
  }

  const selectionCount = selectedIds.size;

  return (
    <div className="flex flex-col h-full">
      <AssetsToolbar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        sort={sort}
        onSortChange={(v) => {
          setSort(v);
          setPage(1);
        }}
        activeFilters={activeFilters}
        onFiltersChange={(f) => {
          setActiveFilters(f);
          setPage(1);
        }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isTagsView={isTagsView}
        onCreateFolder={() => {
          setCreateFolderParentId(null);
          setCreateFolderOpen(true);
        }}
        onUpload={() => setUploadOpen(true)}
      />

      {/* Body: sidebar + content */}
      <SplitPageLayout
        sidebar={
          <AssetsSidebar
            isTagsView={isTagsView}
            showDeleted={showDeleted}
            selectedFolder={selectedFolder}
            totalCount={totalCount}
            deletedCount={deletedCount}
            assetTagsCount={assetTags.length}
            folders={folders}
            folderSearch={folderSearch}
            onFolderSearchChange={setFolderSearch}
            onSelectAllAssets={() => {
              setIsTagsView(false);
              setShowDeleted(false);
              setSelectedFolder(undefined);
            }}
            onSelectTags={() => setIsTagsView(true)}
            onSelectDeleted={() => {
              setIsTagsView(false);
              setShowDeleted(true);
              setSelectedFolder(undefined);
            }}
            onSelectFolder={(id) => {
              setShowDeleted(false);
              setSelectedFolder(id ?? undefined);
            }}
            onCreateFolder={(parentId) => {
              setCreateFolderParentId(parentId);
              setCreateFolderOpen(true);
            }}
            onRenameFolder={setRenameFolder}
            onMoveFolder={setMoveFolderTarget}
            onDeleteFolder={setDeleteFolderTarget}
          />
        }
      >
        {isTagsView ? (
          <TagsView
            tags={assetTags}
            isLoading={tagsLoading}
            onCreateTag={handleCreateAssetTag}
            onRenameTag={handleRenameAssetTag}
            onDeleteTag={handleDeleteAssetTag}
          />
        ) : (
          <>
            {/* Asset listing */}
            <div className="flex-1 overflow-y-auto px-6 pb-4">
              {viewMode === 'grid' ? (
                <AssetGrid
                  assets={assets}
                  spaceId={spaceId}
                  isLoading={isLoading}
                  onAssetClick={setSelectedAsset}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                />
              ) : (
                <AssetList
                  assets={assets}
                  spaceId={spaceId}
                  isLoading={isLoading}
                  showRestore={showDeleted}
                  onRestore={handleRestoreAsset}
                  onAssetClick={setSelectedAsset}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                />
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
              storageKey="perPage:assets"
            />
          </>
        )}
      </SplitPageLayout>

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selectionCount}
        actions={[
          {
            label: 'Select All',
            onClick: () => selectAll(assets.map((a) => a.id)),
          },
          {
            label: 'Tag',
            icon: <Tag className="w-4 h-4" />,
            onClick: () => setBulkTagOpen(true),
          },
          {
            label: 'Move',
            icon: <Folder className="w-4 h-4" />,
            onClick: () => setBulkMoveOpen(true),
          },
          {
            label: 'Delete',
            icon: <Trash2 className="w-4 h-4" />,
            onClick: () => setBulkDeleteOpen(true),
            variant: 'danger',
          },
        ]}
        onClearSelection={clearSelection}
      />

      {/* Create folder modal */}
      <CreateFolderModal
        open={createFolderOpen}
        folders={folders}
        defaultParentId={createFolderParentId}
        onConfirm={handleCreateFolder}
        onCancel={() => setCreateFolderOpen(false)}
      />

      {/* Rename folder modal */}
      <RenameModal
        open={!!renameFolder}
        title="Rename Folder"
        currentName={renameFolder?.name ?? ''}
        onRename={handleRenameFolder}
        onClose={() => setRenameFolder(null)}
      />

      {/* Move folder modal */}
      <MoveFolderModal
        open={!!moveFolderTarget}
        count={1}
        folders={folders}
        excludeId={moveFolderTarget?.id}
        onConfirm={handleMoveFolder}
        onCancel={() => setMoveFolderTarget(null)}
      />

      {/* Delete folder confirm */}
      <ConfirmModal
        open={!!deleteFolderTarget}
        title="Delete Folder"
        message={`Are you sure you want to delete "${deleteFolderTarget?.name}"? Assets inside will not be deleted but will no longer be organized in this folder.`}
        confirmLabel="Delete"
        dangerous
        onConfirm={handleDeleteFolder}
        onCancel={() => setDeleteFolderTarget(null)}
      />

      {/* Bulk move modal */}
      <MoveFolderModal
        open={bulkMoveOpen}
        count={selectionCount}
        folders={folders}
        onConfirm={handleBulkMove}
        onCancel={() => setBulkMoveOpen(false)}
      />

      {/* Bulk delete confirm */}
      <ConfirmModal
        open={bulkDeleteOpen}
        title={`Delete ${selectionCount} asset${selectionCount === 1 ? '' : 's'}`}
        message={`Are you sure you want to delete ${selectionCount} selected asset${selectionCount === 1 ? '' : 's'}? They can be restored from the Deleted assets view.`}
        confirmLabel="Delete"
        dangerous
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />

      {/* Bulk tag modal */}
      <BulkTagModal
        open={bulkTagOpen}
        spaceId={spaceId}
        selectedCount={selectionCount}
        onApply={handleBulkTag}
        onCancel={() => setBulkTagOpen(false)}
        saving={bulkTagSaving}
      />

      {/* Asset detail modal */}
      {selectedAsset && (
        <AssetDetailModal
          asset={selectedAsset}
          spaceId={spaceId}
          folders={folders}
          onClose={() => setSelectedAsset(null)}
          onDeleted={() => {
            setSelectedAsset(null);
            mutateAssets();
            mutateCounts();
          }}
          onSaved={(_updated) => {
            mutateAssets();
            setSelectedAsset(null);
          }}
        />
      )}

      {/* Upload modal */}
      {uploadOpen && (
        <UploadAssetsModal
          spaceId={spaceId}
          folderId={typeof selectedFolder === 'number' ? selectedFolder : null}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => {
            mutateAssets();
            mutateCounts();
          }}
        />
      )}
    </div>
  );
}
