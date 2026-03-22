'use client'

import { useState, useCallback, useEffect, use } from 'react'
import { Play, Settings2, Trash2, Plus, Loader2 } from 'lucide-react'
import { DataTable, type Column, type SortState } from '@/components/ui/data-table'
import { SearchBar } from '@/components/ui/search-bar'
import { RightSidebar } from '@/components/ui/right-sidebar'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { SelectDropdown } from '@/components/ui/select-dropdown'

interface Task {
  id: number
  name: string
  description: string | null
  task_type: string
  last_execution: string | null
  running: boolean
  webhook_url: string | null
  user_dialog: Record<string, any>
  space_id: number
  created_at: string
  updated_at: string
  [key: string]: unknown
}

// ─── Execute dialog ───────────────────────────────────────────────────────────

interface ExecuteDialogProps {
  open: boolean
  task: Task | null
  spaceId: string
  onClose: () => void
  onExecuted: (task: Task) => void
}

function ExecuteDialog({ open, task, spaceId, onClose, onExecuted }: ExecuteDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fields = task ? (Object.entries(task.user_dialog ?? {}) as [string, any][]) : []

  useEffect(() => {
    if (!open || !task) return
    const initial: Record<string, string> = {}
    for (const [key] of fields) initial[key] = ''
    setValues(initial)
    setError(null)
    setRunning(false)
  }, [open, task])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  async function handleExecute() {
    if (!task) return
    setRunning(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/tasks/${task.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Execution failed')
      onExecuted(data.task)
    } catch (e: any) {
      setError(e.message ?? 'Execution failed')
      setRunning(false)
    }
  }

  if (!open || !task) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            Execute: {task.name}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <Plus className="w-4 h-4 rotate-45" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {fields.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This task has no user input fields. Click Execute to run it immediately.
            </p>
          )}
          {fields.map(([key, def]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {def.display_name || key}
                {def.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {def.type === 'option' ? (
                <SelectDropdown
                  value={values[key] ?? null}
                  onChange={(v) => setValues((prev) => ({ ...prev, [key]: v ?? '' }))}
                  options={(def.options ?? []).map((opt: any) => ({ value: opt.value, label: opt.name }))}
                  placeholder="Select..."
                />
              ) : (
                <input
                  type="text"
                  value={values[key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                  placeholder={def.placeholder ?? ''}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              )}
            </div>
          ))}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleExecute}
            disabled={running}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50"
          >
            {running && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {running ? 'Running…' : 'Execute'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TasksPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params)

  const [tasks, setTasks] = useState<Task[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'name', direction: 'asc' })

  // Sidebar (create / edit)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarMode, setSidebarMode] = useState<'create' | 'edit'>('create')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Sidebar form fields
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editWebhookUrl, setEditWebhookUrl] = useState('')
  const [editUserDialog, setEditUserDialog] = useState('{}')
  const [userDialogError, setUserDialogError] = useState<string | null>(null)

  // Execute dialog
  const [executeOpen, setExecuteOpen] = useState(false)
  const [executingTask, setExecutingTask] = useState<Task | null>(null)

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/tasks`)
      const data = await res.json()
      let items: Task[] = data.tasks ?? []

      // Client-side search + sort (tasks lists are small)
      if (search) {
        const q = search.toLowerCase()
        items = items.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            (t.description ?? '').toLowerCase().includes(q),
        )
      }
      items.sort((a, b) => {
        const av = String(a[sort.field] ?? '')
        const bv = String(b[sort.field] ?? '')
        return sort.direction === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      })

      setTasks(items)
      setTotal(items.length)
    } finally {
      setIsLoading(false)
    }
  }, [spaceId, search, sort])

  useEffect(() => { load() }, [load])

  // ─── Sidebar helpers ─────────────────────────────────────────────────────

  function openCreate() {
    setSidebarMode('create')
    setSelectedTask(null)
    setEditName('')
    setEditDescription('')
    setEditWebhookUrl('')
    setEditUserDialog('{}')
    setUserDialogError(null)
    setSaveError(null)
    setSidebarOpen(true)
  }

  function openEdit(task: Task) {
    setSidebarMode('edit')
    setSelectedTask(task)
    setEditName(task.name)
    setEditDescription(task.description ?? '')
    setEditWebhookUrl(task.webhook_url ?? '')
    setEditUserDialog(JSON.stringify(task.user_dialog ?? {}, null, 2))
    setUserDialogError(null)
    setSaveError(null)
    setSidebarOpen(true)
  }

  function closeSidebar() {
    setSidebarOpen(false)
    setSelectedTask(null)
  }

  async function handleSave() {
    if (!editName.trim()) { setSaveError('Name is required'); return }
    try { JSON.parse(editUserDialog) } catch { setUserDialogError('Invalid JSON'); return }
    setSaving(true)
    setSaveError(null)
    try {
      const url =
        sidebarMode === 'create'
          ? `/api/admin/spaces/${spaceId}/tasks`
          : `/api/admin/spaces/${spaceId}/tasks/${selectedTask!.id}`
      const res = await fetch(url, {
        method: sidebarMode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
          task_type: 'webhook',
          webhook_url: editWebhookUrl.trim() || null,
          user_dialog: JSON.parse(editUserDialog),
        }),
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

  // ─── Delete ──────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deletingTask) return
    setDeleting(true)
    try {
      await fetch(`/api/admin/spaces/${spaceId}/tasks/${deletingTask.id}`, { method: 'DELETE' })
      setDeleteOpen(false)
      load()
    } finally {
      setDeleting(false)
    }
  }

  // ─── Execute ─────────────────────────────────────────────────────────────

  function handleExecuted(task: Task) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))
    setExecuteOpen(false)
  }

  // ─── Columns ─────────────────────────────────────────────────────────────

  const COLUMNS: Column<Task>[] = [
    {
      key: 'name',
      label: 'Task name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">{row.name}</p>
            {row.description && (
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{row.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'last_execution',
      label: 'Last Execution',
      sortable: true,
      render: (row) =>
        row.running ? (
          <span className="flex items-center gap-1.5 text-teal-600 text-sm">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Running…
          </span>
        ) : row.last_execution ? (
          <span className="text-gray-500 dark:text-gray-400 text-sm">
            {new Date(row.last_execution as string).toLocaleDateString('en-US', {
              month: '2-digit', day: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </span>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        ),
    },
    {
      key: '_actions',
      label: '',
      width: '120px',
      render: (row) => (
        <div
          className="flex items-center gap-0.5 justify-end opacity-0 group-hover/row:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            title="Execute task"
            disabled={!!row.running}
            onClick={() => { setExecutingTask(row); setExecuteOpen(true) }}
            className="p-1.5 text-gray-400 hover:text-teal-600 disabled:opacity-30 transition-colors rounded"
          >
            <Play className="w-4 h-4" />
          </button>
          <button
            title="Edit task"
            onClick={() => openEdit(row)}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors rounded"
          >
            <Settings2 className="w-4 h-4" />
          </button>
          <button
            title="Delete task"
            onClick={() => { setDeletingTask(row); setDeleteOpen(true) }}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tasks</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Trigger builds or other common use-cases like product syncs and publishing tasks.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
        >
          <Plus className="size-4" />
          Create Task
        </button>
      </div>

      {/* Search */}
      <div className="my-6">
        <SearchBar value={search} onChange={setSearch} placeholder="Search tasks…" />
      </div>

      {/* Table — add group/row class so hover actions work */}
      <div className="[&_tbody_tr]:group/row">
        <DataTable
          columns={COLUMNS}
          data={tasks}
          keyField="id"
          sort={sort}
          onSort={(field, direction) => setSort({ field, direction })}
          isLoading={isLoading}
          emptyMessage="No tasks found"
          onRowClick={openEdit}
        />
      </div>

      {!isLoading && total > 0 && (
        <p className="mt-3 text-xs text-gray-400">{total} task{total !== 1 ? 's' : ''} total</p>
      )}

      {/* Create / Edit sidebar */}
      <RightSidebar
        open={sidebarOpen}
        onClose={closeSidebar}
        width="w-[480px]"
        header={
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {sidebarMode === 'create' ? 'New Task' : 'Edit Task'}
          </span>
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
        <div className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="e.g. Sync job"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Description
            </label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="e.g. Trigger a sync of all published content"
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>

          {/* Task type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Task type
            </label>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-teal-600 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Webhook</span>
            </div>
          </div>

          {/* Webhook URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Webhook
            </label>
            <input
              type="url"
              value={editWebhookUrl}
              onChange={(e) => setEditWebhookUrl(e.target.value)}
              placeholder="https://mydomain.com/my-post-endpoint"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Provide the endpoint where you want to send a POST request. The payload contains
              the task and space id. E.g.: {`{"task": {"id": 1, "name": "Sync job"}, "space_id": 12345}`}
            </p>
          </div>

          {/* User dialog */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              User dialog
            </label>
            <textarea
              value={editUserDialog}
              onChange={(e) => { setEditUserDialog(e.target.value); setUserDialogError(null) }}
              onBlur={() => {
                try { JSON.parse(editUserDialog); setUserDialogError(null) }
                catch { setUserDialogError('Invalid JSON') }
              }}
              rows={8}
              className={`w-full px-3 py-2 border rounded-lg text-xs font-mono bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none ${
                userDialogError ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'
              }`}
            />
            {userDialogError && <p className="mt-1 text-xs text-red-500">{userDialogError}</p>}
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              User dialog is a dialog which pops up when the user wants to execute the task.
            </p>
          </div>

          {saveError && <p className="text-sm text-red-500">{saveError}</p>}
        </div>
      </RightSidebar>

      {/* Execute dialog */}
      <ExecuteDialog
        open={executeOpen}
        task={executingTask}
        spaceId={spaceId}
        onClose={() => setExecuteOpen(false)}
        onExecuted={handleExecuted}
      />

      {/* Delete confirm */}
      <ConfirmModal
        open={deleteOpen}
        title="Delete task"
        message={`Are you sure you want to delete "${deletingTask?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        dangerous
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  )
}
