'use client'

import { useState, useCallback, useEffect, use } from 'react'
import { FolderPlus, Plus, Search, Copy, Trash2, Move, Files } from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { GroupTree, type ComponentGroup } from '@/components/block-library/group-tree'
import { CreateGroupModal } from '@/components/block-library/create-group-modal'
import { CreateBlockModal } from '@/components/block-library/create-block-modal'
import { BlockList, type Block } from '@/components/block-library/block-list'
import { EditBlockModal } from '@/components/block-library/edit-block-modal'
import type { SortOption } from '@/components/ui/search-filter-bar'

const SORT_OPTIONS: SortOption[] = [
  { value: 'name_asc', label: 'Name (A–Z)' },
  { value: 'name_desc', label: 'Name (Z–A)' },
  { value: 'created_at_desc', label: 'Created (newest)' },
  { value: 'created_at_asc', label: 'Created (oldest)' },
  { value: 'updated_at_desc', label: 'Updated (newest)' },
  { value: 'updated_at_asc', label: 'Updated (oldest)' },
]

function parseSortOption(sort: string): { field: string; dir: string } {
  const last = sort.lastIndexOf('_')
  return { field: sort.slice(0, last), dir: sort.slice(last + 1) }
}

export default function BlockLibraryPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params)

  // ─── Data ──────────────────────────────────────────────────────────────────
  const [blocks, setBlocks] = useState<Block[]>([])
  const [total, setTotal] = useState(0)
  const [groups, setGroups] = useState<ComponentGroup[]>([])
  const [counts, setCounts] = useState<{ total: number; by_group: Record<string, number> } | undefined>()
  const [isLoading, setIsLoading] = useState(true)

  // ─── UI state ──────────────────────────────────────────────────────────────
  const [selectedGroupUuid, setSelectedGroupUuid] = useState<string | null>(null)
  // null = all, string = group uuid

  // ─── Search / sort ─────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('name_asc')

  // ─── Pagination ────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)

  // ─── Group sidebar search ──────────────────────────────────────────────────
  const [groupSearch, setGroupSearch] = useState('')

  // ─── Block modals ──────────────────────────────────────────────────────────
  const [createBlockOpen, setCreateBlockOpen] = useState(false)
  const [editBlock, setEditBlock] = useState<Block | null>(null)

  // ─── Group modals ──────────────────────────────────────────────────────────
  const [createGroupOpen, setCreateGroupOpen] = useState(false)
  const [renameGroup, setRenameGroup] = useState<ComponentGroup | null>(null)
  const [renameName, setRenameName] = useState('')
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<ComponentGroup | null>(null)

  // ─── Multiselect ───────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [deleteBlocksOpen, setDeleteBlocksOpen] = useState(false)
  const [moveGroupOpen, setMoveGroupOpen] = useState(false)
  const [moveTargetUuid, setMoveTargetUuid] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // ─── Load groups ───────────────────────────────────────────────────────────
  const loadGroups = useCallback(async () => {
    const res = await fetch(`/api/admin/spaces/${spaceId}/component-groups`)
    if (res.ok) {
      const data = await res.json()
      setGroups(data.component_groups ?? [])
    }
  }, [spaceId])

  // ─── Load counts ───────────────────────────────────────────────────────────
  const loadCounts = useCallback(async () => {
    const res = await fetch(`/api/admin/spaces/${spaceId}/component-counts`)
    if (res.ok) {
      const data = await res.json()
      setCounts(data)
    }
  }, [spaceId])

  // ─── Load blocks ───────────────────────────────────────────────────────────
  const loadBlocks = useCallback(async () => {
    setIsLoading(true)
    try {
      const qs = new URLSearchParams()
      qs.set('page', String(page))
      qs.set('per_page', String(perPage))
      if (search.trim()) qs.set('search', search.trim())
      if (selectedGroupUuid !== null) qs.set('group_uuid', selectedGroupUuid)

      const { field, dir } = parseSortOption(sort)
      qs.set('sort_field', field)
      qs.set('sort_dir', dir)

      const res = await fetch(`/api/admin/spaces/${spaceId}/components?${qs}`)
      if (res.ok) {
        const data = await res.json()
        setBlocks(data.components ?? [])
        setTotal(data.total ?? 0)
      }
    } finally {
      setIsLoading(false)
    }
  }, [spaceId, page, perPage, search, sort, selectedGroupUuid])

  useEffect(() => { loadGroups(); loadCounts() }, [loadGroups, loadCounts])
  useEffect(() => { loadBlocks() }, [loadBlocks])

  useEffect(() => { setPage(1) }, [search, sort, selectedGroupUuid])

  // Clear selection when blocks change
  useEffect(() => { setSelectedIds(new Set()) }, [blocks])

  // ─── Block CRUD ────────────────────────────────────────────────────────────

  async function handleCreateBlock(data: {
    name: string
    description: string
    is_nestable: boolean
    is_root: boolean
    component_group_uuid: string | null
  }) {
    const res = await fetch(`/api/admin/spaces/${spaceId}/components`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message ?? 'Failed to create block')
    }
    setCreateBlockOpen(false)
    await Promise.all([loadBlocks(), loadCounts()])
  }

  // ─── Group CRUD ────────────────────────────────────────────────────────────

  async function handleCreateGroup(name: string) {
    const res = await fetch(`/api/admin/spaces/${spaceId}/component-groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message ?? 'Failed to create group')
    }
    setCreateGroupOpen(false)
    await loadGroups()
  }

  async function handleRenameGroup() {
    if (!renameGroup || !renameName.trim()) return
    const res = await fetch(`/api/admin/spaces/${spaceId}/component-groups/${renameGroup.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: renameName.trim() }),
    })
    if (res.ok) {
      setRenameGroup(null)
      await loadGroups()
    }
  }

  async function handleDeleteGroup() {
    if (!deleteGroupTarget) return
    const res = await fetch(`/api/admin/spaces/${spaceId}/component-groups/${deleteGroupTarget.id}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      if (selectedGroupUuid === deleteGroupTarget.uuid) setSelectedGroupUuid(null)
      setDeleteGroupTarget(null)
      await loadGroups()
    }
  }

  // ─── Bulk actions ──────────────────────────────────────────────────────────

  async function handleDuplicate() {
    setActionLoading(true)
    try {
      await Promise.all(
        [...selectedIds].map((id) =>
          fetch(`/api/admin/spaces/${spaceId}/components/${id}/duplicate`, { method: 'POST' }),
        ),
      )
      setSelectedIds(new Set())
      await Promise.all([loadBlocks(), loadCounts()])
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCopy() {
    const selected = blocks.filter((b) => selectedIds.has(b.id))
    const text = JSON.stringify(selected.map((b) => ({ name: b.name, display_name: b.display_name })), null, 2)
    await navigator.clipboard.writeText(text)
  }

  async function handleMove() {
    if (moveTargetUuid === undefined) return
    setActionLoading(true)
    try {
      await Promise.all(
        [...selectedIds].map((id) =>
          fetch(`/api/admin/spaces/${spaceId}/components/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ component_group_uuid: moveTargetUuid }),
          }),
        ),
      )
      setSelectedIds(new Set())
      setMoveGroupOpen(false)
      await Promise.all([loadBlocks(), loadCounts()])
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDeleteBlocks() {
    setActionLoading(true)
    try {
      await Promise.all(
        [...selectedIds].map((id) =>
          fetch(`/api/admin/spaces/${spaceId}/components/${id}`, { method: 'DELETE' }),
        ),
      )
      setSelectedIds(new Set())
      setDeleteBlocksOpen(false)
      await Promise.all([loadBlocks(), loadCounts()])
    } finally {
      setActionLoading(false)
    }
  }

  const hasSelection = selectedIds.size > 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Block Library</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreateGroupOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            Create Group
          </button>
          <button
            onClick={() => setCreateBlockOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Block
          </button>
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-60 shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-y-auto py-4 px-3 gap-1">
          <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Groups</p>

          {/* Group search */}
          <div className="relative mb-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              placeholder="Search groups..."
              className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <GroupTree
            groups={groups}
            selectedUuid={selectedGroupUuid}
            onSelect={setSelectedGroupUuid}
            search={groupSearch}
            counts={counts}
            onCreateGroup={() => setCreateGroupOpen(true)}
            onRenameGroup={(g) => { setRenameGroup(g); setRenameName(g.name) }}
            onDeleteGroup={setDeleteGroupTarget}
          />
        </div>

        {/* Content area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Toolbar */}
          <div className="px-6 pt-4 pb-3 flex items-center gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search blocks..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Block listing */}
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            <BlockList
              blocks={blocks}
              groups={groups}
              isLoading={isLoading}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onEdit={setEditBlock}
            />
          </div>

          {/* Pagination */}
          <Pagination
            total={total}
            page={page}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={(n) => { setPerPage(n); setPage(1) }}
          />
        </div>
      </div>

      {/* Bulk action bar */}
      {hasSelection && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-gray-900 dark:bg-gray-800 text-white rounded-xl shadow-2xl px-4 py-3">
          <span className="text-sm font-medium mr-2 text-gray-300">
            {selectedIds.size} selected
          </span>

          <button
            onClick={handleDuplicate}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
            title="Duplicate"
          >
            <Files className="w-4 h-4" />
            Duplicate
          </button>

          <button
            onClick={handleCopy}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
            title="Copy names to clipboard"
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>

          <button
            onClick={() => { setMoveTargetUuid(null); setMoveGroupOpen(true) }}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
            title="Move to group"
          >
            <Move className="w-4 h-4" />
            Move
          </button>

          <div className="w-px h-5 bg-white/20 mx-1" />

          <button
            onClick={() => setDeleteBlocksOpen(true)}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}

      {/* Edit block modal */}
      {editBlock && (
        <EditBlockModal
          open={!!editBlock}
          block={editBlock}
          spaceId={spaceId}
          groups={groups}
          onClose={() => setEditBlock(null)}
          onSaved={(updatedBlock) => {
            setBlocks((prev) => prev.map((b) => (b.id === updatedBlock.id ? updatedBlock : b)))
            setEditBlock(updatedBlock)
          }}
        />
      )}

      {/* Create block modal */}
      <CreateBlockModal
        open={createBlockOpen}
        groups={groups}
        onConfirm={handleCreateBlock}
        onCancel={() => setCreateBlockOpen(false)}
      />

      {/* Create group modal */}
      <CreateGroupModal
        open={createGroupOpen}
        onConfirm={handleCreateGroup}
        onCancel={() => setCreateGroupOpen(false)}
      />

      {/* Rename group modal */}
      {renameGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRenameGroup(null)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Rename Group</h2>
            <input
              autoFocus
              type="text"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRenameGroup(); if (e.key === 'Escape') setRenameGroup(null) }}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-teal-500 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setRenameGroup(null)} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleRenameGroup} className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700">Rename</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete group confirm */}
      <ConfirmModal
        open={!!deleteGroupTarget}
        title="Delete Group"
        message={`Are you sure you want to delete "${deleteGroupTarget?.name}"? Blocks inside will not be deleted but will be ungrouped.`}
        confirmLabel="Delete"
        dangerous
        onConfirm={handleDeleteGroup}
        onCancel={() => setDeleteGroupTarget(null)}
      />

      {/* Delete blocks confirm */}
      <ConfirmModal
        open={deleteBlocksOpen}
        title="Delete Blocks"
        message={`Are you sure you want to delete ${selectedIds.size} block${selectedIds.size === 1 ? '' : 's'}? This action cannot be undone.`}
        confirmLabel="Delete"
        dangerous
        onConfirm={handleDeleteBlocks}
        onCancel={() => setDeleteBlocksOpen(false)}
      />

      {/* Move to group modal */}
      {moveGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMoveGroupOpen(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Move {selectedIds.size} block{selectedIds.size === 1 ? '' : 's'} to group
            </h2>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-y-auto max-h-64 mb-4">
              <button
                onClick={() => setMoveTargetUuid(null)}
                className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                  moveTargetUuid === null
                    ? 'bg-gray-100 dark:bg-gray-800 text-teal-600 dark:text-teal-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                No group
              </button>
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setMoveTargetUuid(g.uuid)}
                  className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                    moveTargetUuid === g.uuid
                      ? 'bg-gray-100 dark:bg-gray-800 text-teal-600 dark:text-teal-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setMoveGroupOpen(false)}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleMove}
                disabled={actionLoading}
                className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {actionLoading ? 'Moving...' : 'Move'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
