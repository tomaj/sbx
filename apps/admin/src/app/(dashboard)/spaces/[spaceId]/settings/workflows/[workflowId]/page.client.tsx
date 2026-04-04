'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Trash2, GripVertical, Diamond } from 'lucide-react'
import Link from 'next/link'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { ContentTypeSelector } from '@/components/ui/content-type-selector'
import { RightSidebar } from '@/components/ui/right-sidebar'
import type { WorkflowDetail, WorkflowStageDetail } from '@sbx/types'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { UnsavedChangesModal } from '@/components/ui/unsaved-changes-modal'

// ─── Stage color presets ──────────────────────────────────────────────────────

const COLOR_PRESETS = [
  '#babcb6', '#ffcc12', '#1bb300', '#0069fe', '#ff6b00',
  '#e91e63', '#9c27b0', '#07B2AF', '#819c9c', '#333333',
]

// ─── Edit Stage Modal ─────────────────────────────────────────────────────────

function EditStagePanel({
  stage,
  spaceId,
  workflowId,
  onClose,
  onSaved,
  onDeleted,
}: {
  stage: WorkflowStageDetail | null
  spaceId: string
  workflowId: string
  onClose: () => void
  onSaved: (updated: WorkflowStageDetail) => void
  onDeleted: () => void
}) {
  const [color, setColor] = useState(stage?.color ?? '#07B2AF')
  const [name, setName] = useState(stage?.name ?? '')
  const [isDefault, setIsDefault] = useState(stage?.is_default ?? false)
  const [allowPublish, setAllowPublish] = useState(stage?.allow_publish ?? false)
  const [allowAllStages, setAllowAllStages] = useState(stage?.allow_all_stages ?? true)
  const [allowAllUsers, setAllowAllUsers] = useState(stage?.allow_all_users ?? true)
  const [storyEditingLocked, setStoryEditingLocked] = useState(stage?.story_editing_locked ?? false)
  const [autoRemoveAssignee, setAutoRemoveAssignee] = useState(stage?.auto_remove_assignee ?? false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Sync fields when stage changes
  useEffect(() => {
    if (!stage) return
    setColor(stage.color)
    setName(stage.name)
    setIsDefault(stage.is_default)
    setAllowPublish(stage.allow_publish)
    setAllowAllStages(stage.allow_all_stages)
    setAllowAllUsers(stage.allow_all_users)
    setStoryEditingLocked(stage.story_editing_locked)
    setAutoRemoveAssignee(stage.auto_remove_assignee)
  }, [stage])

  async function handleSave() {
    if (!stage) return
    setSaving(true)
    const res = await fetch(
      `/api/admin/spaces/${spaceId}/workflows/${workflowId}/stages/${stage.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color, isDefault, allowPublish, allowAllStages, allowAllUsers, storyEditingLocked, autoRemoveAssignee }),
      },
    )
    const data = await res.json()
    setSaving(false)
    if (data.workflow_stage) onSaved(data.workflow_stage)
  }

  async function handleDelete() {
    if (!stage) return
    await fetch(`/api/admin/spaces/${spaceId}/workflows/${workflowId}/stages/${stage.id}`, { method: 'DELETE' })
    onDeleted()
  }

  return (
    <>
      <RightSidebar
        open={!!stage}
        onClose={onClose}
        header={<h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Edit stage</h3>}
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        }
      >
        {/* Color + Name */}
        <div className="grid grid-cols-[140px_1fr] gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Color <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg">
              <Diamond className="w-4 h-4 shrink-0" style={{ color }} />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                maxLength={7}
                className="flex-1 text-sm text-gray-900 dark:text-gray-100 bg-transparent outline-none w-0"
              />
            </div>
            <p className="mt-1 text-xs text-gray-400 text-right">{color.length}/7</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-5 h-5 rounded-full border-2 ${color === c ? 'border-gray-600 dark:border-gray-300' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Stage name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="mt-1 text-xs text-gray-400 text-right">{name.length}/20</p>
          </div>
        </div>

        {/* Default */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
          <span className="text-sm text-gray-700 dark:text-gray-300">Define as default stage for new content items</span>
        </label>

        {/* Content rights */}
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Content rights</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Choose who has rights to publish and schedule content.</p>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={allowPublish} onChange={(e) => setAllowPublish(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Administrators</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={allowAllUsers} onChange={(e) => setAllowAllUsers(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">All users</span>
            </label>
          </div>
        </div>

        {/* Stage transition */}
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Stage transition and access rules</p>

          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Lock editing</p>
          <label className="flex items-center gap-2 cursor-pointer mb-4">
            <input type="checkbox" checked={storyEditingLocked} onChange={(e) => setStoryEditingLocked(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Lock visual editor from editing when in this stage</span>
          </label>

          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Next available stages</p>
          <div className="flex gap-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={allowAllStages} onChange={() => setAllowAllStages(true)}
                className="w-4 h-4 border-gray-300 text-teal-600 focus:ring-teal-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">All stages</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={!allowAllStages} onChange={() => setAllowAllStages(false)}
                className="w-4 h-4 border-gray-300 text-teal-600 focus:ring-teal-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Specific stages</span>
            </label>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Users/Roles who can change the stage from "{name}" to the next available stage.
          </p>
          <div className="flex gap-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={allowAllUsers} onChange={() => setAllowAllUsers(true)}
                className="w-4 h-4 border-gray-300 text-teal-600 focus:ring-teal-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">All users</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={!allowAllUsers} onChange={() => setAllowAllUsers(false)}
                className="w-4 h-4 border-gray-300 text-teal-600 focus:ring-teal-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Specific users/roles</span>
            </label>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={autoRemoveAssignee} onChange={(e) => setAutoRemoveAssignee(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Unassigns users and roles when the content is published</span>
          </label>
        </div>
      </RightSidebar>

      <ConfirmModal
        open={confirmDelete}
        title="Delete Stage"
        message={`Are you sure you want to delete the "${name}" stage?`}
        confirmLabel="Delete"
        dangerous
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}

// ─── Workflow Editor Page ─────────────────────────────────────────────────────

export default function WorkflowEditorPage({
  params,
}: {
  params: Promise<{ spaceId: string; workflowId: string }>
}) {
  const { spaceId, workflowId } = use(params)
  const isNew = workflowId === 'new'
  const router = useRouter()

  const [name, setName] = useState('')
  const [contentTypes, setContentTypes] = useState<string[]>([])
  const [stages, setStages] = useState<WorkflowStageDetail[]>([])
  const [newColor, setNewColor] = useState('#07B2AF')
  const [newStageName, setNewStageName] = useState('')
  const [editingStage, setEditingStage] = useState<WorkflowStageDetail | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(!isNew)
  const [isDirty, setIsDirty] = useState(false)
  const { showModal: showUnsavedModal, handleConfirm: confirmUnsaved, handleCancel: cancelUnsaved } = useUnsavedChanges(isDirty)

  useEffect(() => {
    if (isNew) return
    fetch(`/api/admin/spaces/${spaceId}/workflows/${workflowId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.workflow) {
          setName(d.workflow.name)
          setContentTypes(d.workflow.content_types ?? [])
          setStages(d.workflow.stages ?? [])
        }
        setLoading(false)
      })
  }, [spaceId, workflowId, isNew])

  async function handleSave() {
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)
    try {
      if (isNew) {
        const res = await fetch(`/api/admin/spaces/${spaceId}/workflows`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), contentTypes }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message ?? 'Failed')
        setIsDirty(false)
        router.push(`/spaces/${spaceId}/settings/workflows/${data.workflow.id}`)
      } else {
        const res = await fetch(`/api/admin/spaces/${spaceId}/workflows/${workflowId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), contentTypes }),
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.message ?? 'Failed') }
        setIsDirty(false)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function addStage() {
    if (!newStageName.trim()) return
    const res = await fetch(`/api/admin/spaces/${spaceId}/workflows/${workflowId}/stages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newStageName.trim(), color: newColor }),
    })
    const data = await res.json()
    if (data.workflow_stage) {
      setStages((prev) => [...prev, data.workflow_stage])
      setNewStageName('')
    }
  }

  function handleStageUpdated(updated: WorkflowStageDetail) {
    setStages((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    setEditingStage(null)
  }

  function handleStageDeleted() {
    if (!editingStage) return
    setStages((prev) => prev.filter((s) => s.id !== editingStage.id))
    setEditingStage(null)
  }

  const sortedStages = stages.slice().sort((a, b) => a.position - b.position)

  if (loading) {
    return (
      <div className="max-w-2xl px-10 py-8">
        <div className="h-6 w-40 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-8" />
        <div className="space-y-4">
          <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl px-10 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link
            href={`/spaces/${spaceId}/settings/workflows`}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Workflows
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {isNew ? 'New Workflow' : 'Edit Workflow'}
        </h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg transition-colors"
        >
          <Check className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Workflow'}
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {/* Name */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setIsDirty(true) }}
          placeholder="Workflow name"
          className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Content types */}
      <div className="mb-8">
        <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Content types the workflow will be applied for <span className="text-red-500">*</span>
        </label>
        <ContentTypeSelector
          spaceId={spaceId}
          value={contentTypes}
          onChange={(v) => { setContentTypes(v); setIsDirty(true) }}
        />
      </div>

      {/* Divider */}
      <hr className="border-gray-200 dark:border-gray-700 mb-8" />

      {/* Workflow stages */}
      {!isNew && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Workflow Stages</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            These are the stages of this workflow. And they are ordered according to the order configured here, and the first item in this list is automatically activated in stories that use this workflow.
          </p>

          {/* Add stage row */}
          <div className="grid grid-cols-[140px_1fr_auto] gap-3 mb-2 items-end">
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Color <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg">
                <Diamond className="w-4 h-4 shrink-0" style={{ color: newColor }} />
                <input
                  type="text"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  maxLength={7}
                  className="flex-1 text-sm text-gray-900 dark:text-gray-100 bg-transparent outline-none w-0"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400 text-right">7/7</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Stage name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addStage()}
                placeholder="Drafting, Reviewing..."
                maxLength={20}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="mt-1 text-xs text-gray-400 text-right">{newStageName.length}/20</p>
            </div>
            <button
              type="button"
              onClick={addStage}
              disabled={!newStageName.trim()}
              className="px-4 py-2 text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 disabled:opacity-40 disabled:cursor-not-allowed mb-5"
            >
              Add
            </button>
          </div>

          {/* Defined stages */}
          {sortedStages.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Defined stages</p>
              <div className="space-y-2">
                {sortedStages.map((stage) => (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => setEditingStage(stage)}
                    className="w-full flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-left"
                  >
                    <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />
                    <Diamond className="w-5 h-5 shrink-0" style={{ color: stage.color }} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{stage.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {stage.allow_all_stages ? 'All stages' : 'Specific stages'}
                        {' · '}
                        {stage.allow_all_users ? 'All users' : 'Specific users'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <EditStagePanel
        stage={editingStage}
        spaceId={spaceId}
        workflowId={workflowId}
        onClose={() => setEditingStage(null)}
        onSaved={handleStageUpdated}
        onDeleted={handleStageDeleted}
      />

      <UnsavedChangesModal
        open={showUnsavedModal}
        onConfirm={confirmUnsaved}
        onCancel={cancelUnsaved}
      />
    </div>
  )
}
