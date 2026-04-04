'use client'

import { useState, useEffect, use } from 'react'
import { Settings, Trash2, GripVertical } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { RightSidebar } from '@/components/ui/right-sidebar'
import { UnsavedChangesModal } from '@/components/ui/unsaved-changes-modal'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import type { Branch } from '@sbx/types'

// ─── Edit form (inside RightSidebar) ─────────────────────────────────────────

interface BranchFormProps {
  spaceId: string
  branch: Branch | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}

function BranchForm({ spaceId, branch, open, onClose, onSaved }: BranchFormProps) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const { showModal: showUnsavedModal, handleConfirm: confirmUnsaved, handleCancel: cancelUnsaved } = useUnsavedChanges(isDirty)

  useEffect(() => {
    setName(branch?.name ?? '')
    setUrl(branch?.url ?? '')
    setError(null)
    setIsDirty(false)
  }, [branch, open])

  async function handleSave() {
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true); setError(null)
    try {
      const apiUrl = branch
        ? `/api/admin/spaces/${spaceId}/branches/${branch.id}`
        : `/api/admin/spaces/${spaceId}/branches`
      const res = await fetch(apiUrl, {
        method: branch ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), url: url.trim() || null }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message ?? 'Failed to save') }
      onSaved()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!branch) return
    await fetch(`/api/admin/spaces/${spaceId}/branches/${branch.id}`, { method: 'DELETE' })
    onSaved()
  }

  return (
    <>
      <RightSidebar
        open={open}
        onClose={onClose}
        width="w-[420px]"
        header={
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {branch ? 'Edit Pipeline' : 'New Pipeline'}
          </h2>
        }
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              {branch && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 dark:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        }
      >
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setIsDirty(true) }}
            placeholder="Production"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Preview URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setIsDirty(true) }}
            placeholder="https://example.com/"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </RightSidebar>

      <ConfirmModal
        open={confirmDelete}
        title="Delete Pipeline"
        message={`Are you sure you want to delete "${branch?.name ?? ''}"?`}
        confirmLabel="Delete"
        dangerous
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <UnsavedChangesModal
        open={showUnsavedModal}
        onConfirm={confirmUnsaved}
        onCancel={cancelUnsaved}
      />
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PipelinesPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params)
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/admin/spaces/${spaceId}/branches`)
    const data = await res.json()
    setBranches(data.branches ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [spaceId])

  async function handleAdd() {
    if (!newName.trim()) return
    setAdding(true)
    await fetch(`/api/admin/spaces/${spaceId}/branches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    setNewName('')
    setAdding(false)
    load()
  }

  async function handleDelete(b: Branch) {
    await fetch(`/api/admin/spaces/${spaceId}/branches/${b.id}`, { method: 'DELETE' })
    setDeleteTarget(null)
    load()
  }

  function truncate(url: string, max = 30) {
    return url.length > max ? url.slice(0, max) + '...' : url
  }

  return (
    <div className="max-w-3xl px-10 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Pipelines</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
        With pipelines, stages define a strict content staging workflow in your space. This is crucial if you want to
        create a reliable production environment. You can define multiple stages, each with its own API access token for
        your content, to preview and test before it goes live.
      </p>

      {/* Add pipeline inline */}
      <div className="flex gap-2 mb-8">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Pipeline name e.g Staging, Live"
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
          className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 rounded-lg transition-colors"
        >
          Add
        </button>
      </div>

      {loading ? (
        <div>
          <div className="h-5 w-40 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-3" />
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className={`flex items-center gap-4 px-4 py-3 bg-white dark:bg-gray-900 ${i > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}`}>
                <div className="w-4 h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-4 w-28 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                <div className="flex-1 h-4 w-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                <div className="flex gap-1">
                  <div className="w-7 h-7 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="w-7 h-7 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : branches.length === 0 ? (
        <p className="text-sm text-gray-400">No pipelines configured yet.</p>
      ) : (
        <>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Added pipelines ({branches.length})
          </p>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[40px_1fr_1fr_72px] items-center px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <span />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Name</span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Preview URL</span>
              <span />
            </div>

            {branches.map((b, i) => (
              <div
                key={b.id}
                className={`grid grid-cols-[40px_1fr_1fr_72px] items-center px-4 py-3 bg-white dark:bg-gray-900 ${
                  i > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''
                }`}
              >
                <span className="text-gray-400 dark:text-gray-600 cursor-grab">
                  <GripVertical className="w-4 h-4" />
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{b.name}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 truncate" title={b.url ?? ''}>
                  {b.url ? truncate(b.url) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                </span>
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => { setSelectedBranch(b); setPanelOpen(true) }}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(b)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <BranchForm
        spaceId={spaceId}
        branch={selectedBranch}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onSaved={() => { setPanelOpen(false); load() }}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Pipeline"
        message={`Are you sure you want to delete "${deleteTarget?.name ?? ''}"?`}
        confirmLabel="Delete"
        dangerous
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
