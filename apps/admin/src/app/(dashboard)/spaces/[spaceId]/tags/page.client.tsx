'use client'

import { useState, useCallback, useEffect, use } from 'react'
import { Plus, Tag } from 'lucide-react'
import { DataTable, type Column, type SortState } from '@/components/ui/data-table'
import { SearchBar } from '@/components/ui/search-bar'
import { RightSidebar } from '@/components/ui/right-sidebar'
import { InputWithCounter } from '@/components/ui/input-with-counter'

interface TagItem {
  name: string
  taggings_count: number
  [key: string]: unknown
}

interface ApiResponse {
  tags: TagItem[]
}

const COLUMNS: Column<TagItem>[] = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    render: (row) => (
      <span className="font-medium text-gray-900 dark:text-gray-100">{row.name}</span>
    ),
  },
  {
    key: 'taggings_count',
    label: 'Assigned items',
    sortable: true,
    render: (row) => (
      <span className="text-gray-600 dark:text-gray-400">{row.taggings_count}</span>
    ),
  },
]

export default function TagsPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params)

  const [tags, setTags] = useState<TagItem[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'name', direction: 'asc' })

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarMode, setSidebarMode] = useState<'create' | 'edit'>('create')
  const [selectedTag, setSelectedTag] = useState<TagItem | null>(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const qs = new URLSearchParams()
      if (search) qs.set('search', search)
      if (sort.field && sort.direction) qs.set('sort_by', `${sort.field}:${sort.direction}`)
      const res = await fetch(`/api/admin/spaces/${spaceId}/tags?${qs}`)
      const data: ApiResponse = await res.json()
      setTags(data.tags ?? [])
      setTotal(data.tags?.length ?? 0)
    } finally {
      setIsLoading(false)
    }
  }, [spaceId, search, sort])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setSidebarMode('create')
    setSelectedTag(null)
    setEditName('')
    setSaveError(null)
    setSidebarOpen(true)
  }

  function openEdit(tag: TagItem) {
    setSidebarMode('edit')
    setSelectedTag(tag)
    setEditName(tag.name)
    setSaveError(null)
    setSidebarOpen(true)
  }

  function closeSidebar() {
    setSidebarOpen(false)
    setSelectedTag(null)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const url =
        sidebarMode === 'create'
          ? `/api/admin/spaces/${spaceId}/tags`
          : `/api/admin/spaces/${spaceId}/tags/${encodeURIComponent(selectedTag!.name)}`
      const res = await fetch(url, {
        method: sidebarMode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      })
      if (!res.ok) {
        const err = await res.json()
        setSaveError(err?.message ?? 'Failed to save')
        return
      }
      closeSidebar()
      load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tags</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            New tags can be created in the &quot;Entry Configuration&quot; section of a content item or by clicking the &quot;New Tag&quot; button.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
        >
          <Plus className="size-4" />
          New Tag
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <SearchBar value={search} onChange={setSearch} placeholder="Search tags..." />
      </div>

      {/* Table */}
      <DataTable
        columns={COLUMNS}
        data={tags}
        keyField="name"
        sort={sort}
        onSort={(field, direction) => setSort({ field, direction })}
        isLoading={isLoading}
        emptyMessage="No tags found"
        onRowClick={openEdit}
      />

      {/* Total count */}
      {!isLoading && total > 0 && (
        <p className="mt-3 text-xs text-gray-400">{total} tag{total !== 1 ? 's' : ''} total</p>
      )}

      {/* Sidebar */}
      <RightSidebar
        open={sidebarOpen}
        onClose={closeSidebar}
        header={
          <div className="flex items-center gap-2">
            <Tag className="size-4 text-gray-400" />
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {sidebarMode === 'create' ? 'New Tag' : 'Edit Tag'}
            </span>
          </div>
        }
        footer={
          <div className="flex items-center gap-3 w-full justify-end">
            <button
              onClick={closeSidebar}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !editName.trim()}
              className="px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        }
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Name <span className="text-red-500">*</span>
          </label>
          <InputWithCounter
            value={editName}
            onChange={setEditName}
            maxLength={60}
            placeholder="Tag name"
            autoFocus
          />
          {saveError && (
            <p className="mt-2 text-sm text-red-500">{saveError}</p>
          )}
        </div>
      </RightSidebar>
    </div>
  )
}
