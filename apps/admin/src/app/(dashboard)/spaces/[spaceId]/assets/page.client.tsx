'use client'

import { useState, useCallback, useEffect, use } from 'react'
import {
  FolderPlus,
  Upload,
  Images,
  Trash2,
  Search,
  LayoutGrid,
  List,
  Tag,
} from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { SearchFilterBar, type ActiveFilter, type SortOption, type FilterField } from '@/components/ui/search-filter-bar'
import { FolderTree, type AssetFolder } from '@/components/assets/folder-tree'
import { CreateFolderModal } from '@/components/assets/create-folder-modal'
import { AssetGrid, type Asset } from '@/components/assets/asset-grid'
import { AssetList } from '@/components/assets/asset-list'
import { AssetDetailModal } from '@/components/assets/asset-detail-modal'
import { UploadAssetsModal } from '@/components/assets/upload-assets-modal'
import { TagsView, type ComponentInternalTag } from '@/components/block-library/tags-view'

const SORT_OPTIONS: SortOption[] = [
  { value: 'created_at_desc', label: 'Default' },
  { value: 'created_at_asc', label: 'Creation Date (asc)' },
  { value: 'created_at_desc', label: 'Creation Date (desc)' },
  { value: 'updated_at_asc', label: 'Update Date (asc)' },
  { value: 'updated_at_desc', label: 'Update Date (desc)' },
  { value: 'filename_asc', label: 'Name (asc)' },
  { value: 'filename_desc', label: 'Name (desc)' },
]

const FILTER_FIELDS: FilterField[] = [
  {
    key: 'content_type',
    label: 'Type',
    type: 'select',
    options: [
      { value: 'image/', label: 'Images' },
      { value: 'video/', label: 'Videos' },
      { value: 'audio/', label: 'Audio' },
      { value: 'application/pdf', label: 'PDF' },
      { value: 'application/json', label: 'JSON' },
    ],
  },
  { key: 'created_after', label: 'Created after', type: 'date' },
  { key: 'created_before', label: 'Created before', type: 'date' },
]

function parseSortOption(sort: string): { field: string; dir: string } {
  const lastUnderscore = sort.lastIndexOf('_')
  return {
    field: sort.slice(0, lastUnderscore),
    dir: sort.slice(lastUnderscore + 1),
  }
}

export default function AssetsPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params)

  // ─── Data state ────────────────────────────────────────────────────────────
  const [assets, setAssets] = useState<Asset[]>([])
  const [total, setTotal] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [deletedCount, setDeletedCount] = useState(0)
  const [folders, setFolders] = useState<AssetFolder[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // ─── UI state ──────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showDeleted, setShowDeleted] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<number | null | undefined>(undefined)
  // undefined = "All Assets" (no folder filter), null = root (no folder), number = specific folder

  // ─── Search / filter / sort ────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('created_at_desc')
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([])

  // ─── Pagination ────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(24)

  // ─── Tags view ─────────────────────────────────────────────────────────────
  const [isTagsView, setIsTagsView] = useState(false)
  const [assetTags, setAssetTags] = useState<ComponentInternalTag[]>([])
  const [tagsLoading, setTagsLoading] = useState(false)

  // ─── Folder sidebar search ─────────────────────────────────────────────────
  const [folderSearch, setFolderSearch] = useState('')

  // ─── Modals ────────────────────────────────────────────────────────────────
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [createFolderParentId, setCreateFolderParentId] = useState<number | null>(null)
  const [renameFolder, setRenameFolder] = useState<AssetFolder | null>(null)
  const [renameName, setRenameName] = useState('')
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<AssetFolder | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  // ─── Load asset tags ──────────────────────────────────────────────────────
  const loadAssetTags = useCallback(async () => {
    setTagsLoading(true)
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/internal_tags?by_object_type=asset`)
      if (res.ok) {
        const data = await res.json()
        setAssetTags(data.internal_tags ?? [])
      }
    } finally {
      setTagsLoading(false)
    }
  }, [spaceId])

  // ─── Load folders ──────────────────────────────────────────────────────────
  const loadFolders = useCallback(async () => {
    const res = await fetch(`/api/admin/spaces/${spaceId}/assets/folders`)
    if (res.ok) {
      const data = await res.json()
      setFolders(data.asset_folders ?? [])
    }
  }, [spaceId])

  // ─── Load counts ──────────────────────────────────────────────────────────
  const loadCounts = useCallback(async () => {
    const res = await fetch(`/api/admin/spaces/${spaceId}/assets/counts`)
    if (res.ok) {
      const data = await res.json()
      setTotalCount(data.total ?? 0)
      setDeletedCount(data.deleted ?? 0)
    }
  }, [spaceId])

  // ─── Load assets ──────────────────────────────────────────────────────────
  const loadAssets = useCallback(async () => {
    setIsLoading(true)
    try {
      const qs = new URLSearchParams()
      qs.set('page', String(page))
      qs.set('per_page', String(perPage))
      if (search.trim()) qs.set('search', search.trim())
      if (showDeleted) qs.set('deleted', 'true')
      if (selectedFolder !== undefined) {
        qs.set('folder_id', selectedFolder === null ? 'null' : String(selectedFolder))
      }

      const { field, dir } = parseSortOption(sort)
      qs.set('sort_field', field)
      qs.set('sort_dir', dir)

      // Apply active filters
      for (const f of activeFilters) {
        if (!f.value) continue
        if (f.key === 'content_type') qs.set('content_type', f.value)
        // date filters not yet wired to backend (future)
      }

      const res = await fetch(`/api/admin/spaces/${spaceId}/assets?${qs}`)
      if (res.ok) {
        const data = await res.json()
        setAssets(data.assets ?? [])
        setTotal(data.total ?? 0)
      }
    } finally {
      setIsLoading(false)
    }
  }, [spaceId, page, perPage, search, sort, activeFilters, selectedFolder, showDeleted])

  useEffect(() => {
    loadFolders()
    loadCounts()
    loadAssetTags()
  }, [loadFolders, loadCounts, loadAssetTags])

  useEffect(() => {
    loadAssets()
  }, [loadAssets])

  useEffect(() => { if (isTagsView) loadAssetTags() }, [isTagsView, loadAssetTags])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [search, sort, activeFilters, selectedFolder, showDeleted])

  // ─── Folder CRUD ──────────────────────────────────────────────────────────

  async function handleCreateFolder(name: string, parentId: number | null) {
    const res = await fetch(`/api/admin/spaces/${spaceId}/assets/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parent_id: parentId }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message ?? 'Failed to create folder')
    }
    setCreateFolderOpen(false)
    await loadFolders()
  }

  async function handleRenameFolder() {
    if (!renameFolder || !renameName.trim()) return
    const res = await fetch(
      `/api/admin/spaces/${spaceId}/assets/folders/${renameFolder.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameName.trim() }),
      },
    )
    if (res.ok) {
      setRenameFolder(null)
      await loadFolders()
    }
  }

  async function handleDeleteFolder() {
    if (!deleteFolderTarget) return
    const res = await fetch(
      `/api/admin/spaces/${spaceId}/assets/folders/${deleteFolderTarget.id}`,
      { method: 'DELETE' },
    )
    if (res.ok) {
      if (selectedFolder === deleteFolderTarget.id) setSelectedFolder(undefined)
      setDeleteFolderTarget(null)
      await loadFolders()
    }
  }

  // ─── Asset delete/restore ────────────────────────────────────────────────

  async function handleRestoreAsset(asset: Asset) {
    await fetch(`/api/admin/spaces/${spaceId}/assets/${asset.id}?action=restore`, {
      method: 'POST',
    })
    await loadAssets()
    await loadCounts()
  }

  // ─── Asset tag CRUD ──────────────────────────────────────────────────────

  async function handleCreateAssetTag(name: string) {
    const res = await fetch(`/api/admin/spaces/${spaceId}/internal_tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, object_type: 'asset' }),
    })
    if (!res.ok) throw new Error('Failed to create tag')
    await loadAssetTags()
  }

  async function handleRenameAssetTag(tag: ComponentInternalTag, newName: string) {
    const res = await fetch(`/api/admin/spaces/${spaceId}/internal_tags/${tag.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    })
    if (!res.ok) throw new Error('Failed to rename tag')
    await loadAssetTags()
  }

  async function handleDeleteAssetTag(tag: ComponentInternalTag) {
    const res = await fetch(`/api/admin/spaces/${spaceId}/internal_tags/${tag.id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to delete tag')
    await loadAssetTags()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Assets</h1>
        {!isTagsView && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setCreateFolderParentId(null); setCreateFolderOpen(true) }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              Create Folder
            </button>
            <button
              onClick={() => setUploadOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload files
            </button>
          </div>
        )}
      </div>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-60 shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-y-auto py-4 px-3 gap-1">
          {/* All Assets */}
          <button
            onClick={() => { setIsTagsView(false); setShowDeleted(false); setSelectedFolder(undefined) }}
            className={`flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors ${
              !isTagsView && !showDeleted && selectedFolder === undefined
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

          {/* Tags */}
          <button
            onClick={() => setIsTagsView(true)}
            className={`flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors ${
              isTagsView
                ? 'text-teal-700 dark:text-teal-300 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-400" />
              Tags
            </span>
            {assetTags.length > 0 && (
              <span className="text-xs text-gray-400">{assetTags.length}</span>
            )}
          </button>

          {/* Deleted assets */}
          <button
            onClick={() => { setIsTagsView(false); setShowDeleted(true); setSelectedFolder(undefined) }}
            className={`flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors ${
              !isTagsView && showDeleted
                ? 'text-teal-700 dark:text-teal-300 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-gray-400" />
              Deleted assets
            </span>
            {deletedCount > 0 && (
              <span className="text-xs text-gray-400">{deletedCount}</span>
            )}
          </button>

          {/* Separator */}
          <div className="border-t border-gray-200 dark:border-gray-700 my-2" />

          {/* Folders section */}
          <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Folders</p>

          {/* Folder search */}
          <div className="relative mb-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={folderSearch}
              onChange={e => setFolderSearch(e.target.value)}
              placeholder="Search folders..."
              className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Folder tree */}
          <FolderTree
            folders={folders}
            selectedId={!showDeleted && selectedFolder !== undefined ? selectedFolder : -1}
            onSelect={id => { setShowDeleted(false); setSelectedFolder(id ?? undefined) }}
            search={folderSearch}
            onCreateFolder={parentId => { setCreateFolderParentId(parentId); setCreateFolderOpen(true) }}
            onRenameFolder={f => { setRenameFolder(f); setRenameName(f.name) }}
            onMoveFolder={() => {}} // TODO: move modal
            onDeleteFolder={setDeleteFolderTarget}
          />
        </div>

        {/* Content area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
              {/* Toolbar */}
              <div className="px-6 pt-4 pb-3 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <SearchFilterBar
                      searchPlaceholder="Search assets..."
                      search={search}
                      onSearchChange={setSearch}
                      sortOptions={SORT_OPTIONS}
                      sort={sort}
                      onSortChange={setSort}
                      filterFields={FILTER_FIELDS}
                      activeFilters={activeFilters}
                      onFiltersChange={setActiveFilters}
                    />
                  </div>

                  {/* View toggle */}
                  <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shrink-0">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 transition-colors ${
                        viewMode === 'grid'
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                          : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 transition-colors ${
                        viewMode === 'list'
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                          : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Asset listing */}
              <div className="flex-1 overflow-y-auto px-6 pb-4">
                {viewMode === 'grid' ? (
                  <AssetGrid
                    assets={assets}
                    spaceId={spaceId}
                    isLoading={isLoading}
                    onAssetClick={setSelectedAsset}
                  />
                ) : (
                  <AssetList
                    assets={assets}
                    spaceId={spaceId}
                    isLoading={isLoading}
                    showRestore={showDeleted}
                    onRestore={handleRestoreAsset}
                    onAssetClick={setSelectedAsset}
                  />
                )}
              </div>

              {/* Pagination */}
              <Pagination
                total={total}
                page={page}
                perPage={perPage}
                onPageChange={setPage}
                onPerPageChange={n => { setPerPage(n); setPage(1) }}
              />
            </>
          )}
        </div>
      </div>

      {/* Create folder modal */}
      <CreateFolderModal
        open={createFolderOpen}
        folders={folders}
        defaultParentId={createFolderParentId}
        onConfirm={handleCreateFolder}
        onCancel={() => setCreateFolderOpen(false)}
      />

      {/* Rename folder inline modal */}
      {renameFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRenameFolder(null)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Rename Folder</h2>
            <input
              autoFocus
              type="text"
              value={renameName}
              onChange={e => setRenameName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRenameFolder(); if (e.key === 'Escape') setRenameFolder(null) }}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-teal-500 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setRenameFolder(null)} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleRenameFolder} className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700">Rename</button>
            </div>
          </div>
        </div>
      )}

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

      {/* Asset detail modal */}
      {selectedAsset && (
        <AssetDetailModal
          asset={selectedAsset}
          spaceId={spaceId}
          onClose={() => setSelectedAsset(null)}
          onDeleted={() => {
            setSelectedAsset(null)
            loadAssets()
            loadCounts()
          }}
          onSaved={updated => {
            setAssets(prev => prev.map(a => a.id === updated.id ? updated : a))
            setSelectedAsset(null)
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
            loadAssets()
            loadCounts()
          }}
        />
      )}
    </div>
  )
}
