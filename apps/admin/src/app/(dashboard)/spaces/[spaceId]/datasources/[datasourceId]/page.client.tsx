'use client'

import { use, useState, useEffect, useCallback, useRef } from 'react'
import { usePerPage } from '@/hooks/use-per-page'
import Link from 'next/link'
import { ArrowLeft, GripVertical, Trash2 } from 'lucide-react'
import { SearchBar } from '@/components/ui/search-bar'
import { RightSidebar } from '@/components/ui/right-sidebar'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { UnsavedChangesModal } from '@/components/ui/unsaved-changes-modal'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { Pagination } from '@/components/ui/pagination'
import type { DatasourceEntry, DatasourceWithDimensions } from '@sbx/types'

// ---- Entry row ----

interface EntryRowProps {
  entry: DatasourceEntry
  onSave: (id: number, name: string, value: string) => Promise<void>
  onDelete: (entry: DatasourceEntry) => void
  dragging: boolean
  isDropTarget: boolean
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
}

function EntryRow({
  entry,
  onSave,
  onDelete,
  dragging,
  isDropTarget,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: EntryRowProps) {
  const [name, setName] = useState(entry.name)
  const [value, setValue] = useState(entry.value)
  const [saving, setSaving] = useState(false)
  const isDirty = name !== entry.name || value !== entry.value

  async function handleSave() {
    setSaving(true)
    await onSave(entry.id, name, value)
    setSaving(false)
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => { e.preventDefault(); onDragOver(e) }}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`flex items-center gap-3 px-4 py-2.5 border-b transition-colors ${
        dragging
          ? 'opacity-40 bg-teal-50 dark:bg-teal-900/10 border-gray-100 dark:border-gray-800'
          : isDropTarget
            ? 'border-t-2 border-t-teal-500 border-b-gray-100 dark:border-b-gray-800 bg-teal-50/50 dark:bg-teal-900/5'
            : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
    >
      <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 shrink-0">
        <GripVertical className="size-4" />
      </div>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        className="flex-1 min-w-0 px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
      />

      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Value"
        className="flex-[2] min-w-0 px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
      />

      <button
        onClick={handleSave}
        disabled={saving || !isDirty}
        className="shrink-0 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 text-gray-700 dark:text-gray-300 transition-colors"
      >
        {saving ? '...' : 'Save'}
      </button>

      <button
        onClick={() => onDelete(entry)}
        className="shrink-0 p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}

// ---- Main page ----

export default function DatasourceDetailPage({
  params,
}: {
  params: Promise<{ spaceId: string; datasourceId: string }>
}) {
  const { spaceId, datasourceId } = use(params)

  const [datasource, setDatasource] = useState<DatasourceWithDimensions | null>(null)
  const [entries, setEntries] = useState<DatasourceEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = usePerPage('perPage:datasource-entries', 25)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const [newName, setNewName] = useState('')
  const [newValue, setNewValue] = useState('')
  const [adding, setAdding] = useState(false)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editIsDirty, setEditIsDirty] = useState(false)
  const { showModal: showUnsavedModal, handleConfirm: confirmUnsaved, handleCancel: cancelUnsaved } = useUnsavedChanges(editIsDirty)

  const [deleteTarget, setDeleteTarget] = useState<DatasourceEntry | null>(null)

  const dragIndex = useRef<number | null>(null)
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Fetch datasource via MAPI single GET
  const fetchDatasource = useCallback(async () => {
    const res = await fetch(`/api/admin/spaces/${spaceId}/datasources/${datasourceId}`)
    if (res.ok) {
      const data = await res.json()
      if (data.datasource) setDatasource(data.datasource)
    }
  }, [spaceId, datasourceId])

  // Fetch entries via MAPI /datasource_entries?datasource_id=...
  const fetchEntries = useCallback(async () => {
    setIsLoading(true)
    const p = new URLSearchParams({
      datasource_id: datasourceId,
      page: String(page),
      per_page: String(perPage),
    })
    if (search.trim()) p.set('search', search.trim())
    const res = await fetch(`/api/admin/spaces/${spaceId}/datasource_entries?${p}`)
    if (res.ok) {
      const data = await res.json()
      setEntries(data.datasource_entries ?? [])
      setTotal(data.total ?? 0)
    }
    setIsLoading(false)
  }, [spaceId, datasourceId, page, perPage, search])

  useEffect(() => { fetchDatasource() }, [fetchDatasource])
  useEffect(() => { fetchEntries() }, [fetchEntries])

  async function handleAdd() {
    if (!newName.trim() || !newValue.trim()) return
    setAdding(true)
    const res = await fetch(`/api/admin/spaces/${spaceId}/datasource_entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        datasource_entry: {
          name: newName.trim(),
          value: newValue.trim(),
          datasource_id: parseInt(datasourceId),
        },
      }),
    })
    if (res.ok) {
      setNewName('')
      setNewValue('')
      fetchEntries()
    }
    setAdding(false)
  }

  async function handleSaveEntry(id: number, name: string, value: string) {
    await fetch(`/api/admin/spaces/${spaceId}/datasource_entries/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datasource_entry: { name, value } }),
    })
    fetchEntries()
  }

  async function handleDeleteEntry() {
    if (!deleteTarget) return
    await fetch(`/api/admin/spaces/${spaceId}/datasource_entries/${deleteTarget.id}`, {
      method: 'DELETE',
    })
    setDeleteTarget(null)
    fetchEntries()
  }

  function openEdit() {
    if (!datasource) return
    setEditName(datasource.name)
    setEditSlug(datasource.slug)
    setEditError(null)
    setEditIsDirty(false)
    setSidebarOpen(true)
  }

  async function handleEditSave() {
    if (!datasource) return
    setEditSaving(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/datasources/${datasource.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasource: { name: editName.trim(), slug: editSlug.trim() } }),
      })
      const data = await res.json()
      if (res.ok) {
        setEditIsDirty(false)
        setSidebarOpen(false)
        fetchDatasource()
      } else {
        setEditError(data.message ?? 'Failed to update datasource')
      }
    } catch {
      setEditError('Network error')
    } finally {
      setEditSaving(false)
    }
  }

  function handleDragStart(index: number) {
    dragIndex.current = index
    setDragSourceIndex(index)
  }

  function handleDragOver(index: number) {
    if (dragOverIndex !== index) setDragOverIndex(index)
  }

  async function handleDrop(dropIndex: number) {
    const from = dragIndex.current
    setDragSourceIndex(null)
    setDragOverIndex(null)
    dragIndex.current = null
    if (from === null || from === dropIndex) return
    const reordered = [...entries]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(dropIndex, 0, moved)
    setEntries(reordered)
    await fetch(
      `/api/admin/spaces/${spaceId}/datasources/${datasourceId}/entries/reorder`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: reordered.map((e) => e.id) }),
      },
    )
    fetchEntries()
  }

  return (
    <>
      <div className="flex flex-col min-h-full">
        <div className="px-8 pt-6 pb-0">
          <Link
            href={`/spaces/${spaceId}/datasources`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Datasources
          </Link>

          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {datasource?.name ?? '...'}
            </h1>
            <button
              onClick={openEdit}
              className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Edit
            </button>
          </div>

          {/* Add entry form */}
          <div className="flex items-center gap-2 mb-4 p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800/40">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name"
              className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
            />
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Value"
              className="flex-[2] px-3 py-2 border border-gray-200 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newName.trim() || !newValue.trim()}
              className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded font-medium transition-colors shrink-0"
            >
              {adding ? '...' : 'Add'}
            </button>
          </div>

          <div className="mb-2">
            <SearchBar
              value={search}
              onChange={(v) => { setSearch(v); setPage(1) }}
              placeholder="Search by name or value..."
            />
          </div>
        </div>

        {/* Entries list */}
        <div className="flex-1">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800"
              >
                <div className="size-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div
                  className="h-8 rounded bg-gray-200 dark:bg-gray-700 animate-pulse flex-1"
                  style={{ animationDelay: `${i * 40}ms` }}
                />
                <div
                  className="h-8 rounded bg-gray-200 dark:bg-gray-700 animate-pulse flex-[2]"
                  style={{ animationDelay: `${i * 40 + 20}ms` }}
                />
                <div className="h-8 w-14 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div className="size-7 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              </div>
            ))
          ) : entries.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No entries found</div>
          ) : (
            entries.map((entry, index) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                onSave={handleSaveEntry}
                onDelete={setDeleteTarget}
                dragging={dragSourceIndex === index}
                isDropTarget={dragOverIndex === index && dragSourceIndex !== index}
                onDragStart={() => handleDragStart(index)}
                onDragOver={() => handleDragOver(index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={() => { dragIndex.current = null; setDragSourceIndex(null); setDragOverIndex(null) }}
              />
            ))
          )}
        </div>

        <Pagination
          total={total}
          page={page}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={(n) => { setPerPage(n); setPage(1) }}
          storageKey="perPage:datasource-entries"
        />
      </div>

      {/* Edit sidebar */}
      <RightSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        header={
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {datasource?.name}
          </span>
        }
        footer={
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(false)}
              className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleEditSave}
              disabled={editSaving}
              className="px-4 py-2 text-sm bg-teal-200 hover:bg-teal-300 disabled:opacity-60 text-teal-800 rounded-md font-medium transition-colors"
            >
              {editSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        }
      >
        {editError && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-md">
            {editError}
          </p>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={editName}
            onChange={(e) => { setEditName(e.target.value); setEditIsDirty(true) }}
            className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            ID/Slug <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={editSlug}
            onChange={(e) => { setEditSlug(e.target.value); setEditIsDirty(true) }}
            className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </RightSidebar>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Entry"
        message={`Delete entry "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        onConfirm={handleDeleteEntry}
        onCancel={() => setDeleteTarget(null)}
      />

      <UnsavedChangesModal open={showUnsavedModal} onConfirm={confirmUnsaved} onCancel={cancelUnsaved} />
    </>
  )
}
