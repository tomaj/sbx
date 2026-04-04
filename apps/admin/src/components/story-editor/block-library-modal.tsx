'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { X, FolderPlus, Plus, Search } from 'lucide-react'
import { usePerPage } from '@/hooks/use-per-page'
import { Pagination } from '@/components/ui/pagination'
import { GroupTree, type ComponentGroup } from '@/components/block-library/group-tree'
import { CreateGroupModal } from '@/components/block-library/create-group-modal'
import { CreateBlockModal } from '@/components/block-library/create-block-modal'
import { BlockList, type Block } from '@/components/block-library/block-list'
import { EditBlockModal } from '@/components/block-library/edit-block-modal'
import { SelectDropdown } from '@/components/ui/select-dropdown'

const SORT_OPTIONS = [
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'updated_at', label: 'Updated (newest)' },
]

interface BlockLibraryModalProps {
  spaceId: string
  onClose: () => void
}

export function BlockLibraryModal({ spaceId, onClose }: BlockLibraryModalProps) {
  const [allBlocks, setAllBlocks] = useState<Block[]>([])
  const [groups, setGroups] = useState<ComponentGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [selectedGroupUuid, setSelectedGroupUuid] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('name')

  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = usePerPage('perPage:blocks-modal', 25)

  const [createBlockOpen, setCreateBlockOpen] = useState(false)
  const [editBlock, setEditBlock] = useState<Block | null>(null)
  const [createGroupOpen, setCreateGroupOpen] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/components`)
      if (res.ok) {
        const data = await res.json()
        setAllBlocks(data.components ?? [])
        setGroups(data.component_groups ?? [])
      }
    } finally {
      setIsLoading(false)
    }
  }, [spaceId])

  const counts = useMemo(() => {
    const byGroup: Record<string, number> = {}
    let total = 0
    for (const b of allBlocks) {
      total++
      if (b.component_group_uuid) {
        byGroup[b.component_group_uuid] = (byGroup[b.component_group_uuid] ?? 0) + 1
      }
    }
    return { total, by_group: byGroup }
  }, [allBlocks])

  const filtered = useMemo(() => {
    let result = allBlocks
    if (selectedGroupUuid !== null) {
      result = result.filter((b) => b.component_group_uuid === selectedGroupUuid)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          (b.display_name ?? '').toLowerCase().includes(q),
      )
    }
    if (sort === 'updated_at') {
      result = [...result].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      )
    } else {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name))
    }
    return result
  }, [allBlocks, selectedGroupUuid, search, sort])

  const total = filtered.length
  const pageBlocks = useMemo(() => {
    const start = (page - 1) * perPage
    return filtered.slice(start, start + perPage)
  }, [filtered, page, perPage])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { setPage(1) }, [search, sort, selectedGroupUuid])

  // Close on Escape (when edit modal is not open)
  useEffect(() => {
    if (editBlock) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [editBlock, onClose])

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
    await loadData()
  }

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
    await loadData()
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Block library</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreateGroupOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            Create Folder
          </button>
          <button
            onClick={() => setCreateBlockOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Block
          </button>
          <button
            onClick={onClose}
            className="p-2 ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: group tree */}
        <div className="w-60 shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-y-auto py-4 px-3 gap-1">
          <GroupTree
            groups={groups}
            selectedUuid={selectedGroupUuid}
            onSelect={(uuid) => setSelectedGroupUuid(uuid)}
            counts={counts}
            isTagsView={false}
            onSelectTags={() => {}}
            onCreateGroup={() => setCreateGroupOpen(true)}
            onRenameGroup={() => {}}
            onDeleteGroup={() => {}}
          />
        </div>

        {/* Center: search + block list */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Toolbar */}
          <div className="px-6 pt-4 pb-3 flex items-center gap-3 flex-shrink-0">
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
            <SelectDropdown
              value={sort}
              onChange={(v) => v && setSort(v)}
              options={SORT_OPTIONS}
              className="w-44"
            />
          </div>

          {/* Block list */}
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            <BlockList
              blocks={pageBlocks}
              groups={groups}
              isLoading={isLoading}
              selectedIds={new Set()}
              onSelectionChange={() => {}}
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
            storageKey="perPage:blocks-modal"
          />
        </div>
      </div>

      {/* Edit block modal (renders on top at z-50) */}
      {editBlock && (
        <EditBlockModal
          open={!!editBlock}
          block={editBlock}
          spaceId={spaceId}
          groups={groups}
          onClose={() => setEditBlock(null)}
          onSaved={(updatedBlock) => {
            setAllBlocks((prev) => prev.map((b) => (b.id === updatedBlock.id ? updatedBlock : b)))
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
    </div>
  )
}
