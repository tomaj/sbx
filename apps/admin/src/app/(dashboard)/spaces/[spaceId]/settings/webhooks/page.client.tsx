'use client'

import { useState, useEffect, use, useRef } from 'react'
import { Plus, Trash2, History, Settings, ChevronRight } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { RightSidebar } from '@/components/ui/right-sidebar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Webhook {
  id: number
  name: string
  endpoint: string
  description: string | null
  secret: string | null
  actions: string[]
  activated: boolean
  created_at: string
  updated_at: string
}

// ─── Trigger definitions ──────────────────────────────────────────────────────

interface TriggerDef { value: string; label: string }
interface TriggerGroup { label: string; triggers: TriggerDef[] }

const TRIGGER_GROUPS: TriggerGroup[] = [
  { label: 'Story', triggers: [
    { value: 'story.published', label: 'Published' },
    { value: 'story.unpublished', label: 'Unpublished' },
    { value: 'story.created', label: 'Created' },
    { value: 'story.deleted', label: 'Deleted' },
    { value: 'story.moved', label: 'Moved' },
  ]},
  { label: 'Datasource', triggers: [
    { value: 'datasource.entries_updated', label: 'Entries Updated' },
    { value: 'datasource.created', label: 'Created' },
  ]},
  { label: 'Asset', triggers: [
    { value: 'asset.created', label: 'Created' },
    { value: 'asset.deleted', label: 'Deleted' },
    { value: 'asset.replaced', label: 'Replaced' },
    { value: 'asset.restored', label: 'Restored' },
  ]},
  { label: 'User management', triggers: [
    { value: 'user.created', label: 'Created' },
    { value: 'user.deleted', label: 'Deleted' },
    { value: 'user.roles_updated', label: 'Roles Updated' },
  ]},
  { label: 'Discussion', triggers: [
    { value: 'discussion.created', label: 'Created' },
    { value: 'discussion.resolved', label: 'Resolved' },
    { value: 'discussion.unresolved', label: 'Unresolved' },
    { value: 'discussion.deleted', label: 'Deleted' },
    { value: 'discussion.comment_added', label: 'Comment Added' },
  ]},
  { label: 'Workflow', triggers: [{ value: 'workflow.stage_changed', label: 'Stage Changed' }] },
  { label: 'Pipeline', triggers: [{ value: 'pipeline.deployed', label: 'Deployed' }] },
  { label: 'Release', triggers: [{ value: 'release.merged', label: 'Merged' }] },
]

const ALL_TRIGGERS = TRIGGER_GROUPS.flatMap((g) => g.triggers.map((t) => t.value))

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
        checked ? 'bg-teal-600' : 'bg-gray-200 dark:bg-gray-700'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  )
}

// ─── Events summary ───────────────────────────────────────────────────────────

function eventsSummary(actions: string[]): string {
  if (actions.length === 0) return '0 events'
  const groups = TRIGGER_GROUPS.filter((g) => g.triggers.some((t) => actions.includes(t.value))).map((g) => g.label)
  return `${actions.length} event${actions.length !== 1 ? 's' : ''} (${groups.join(', ')})`
}

// ─── Webhook card ─────────────────────────────────────────────────────────────

interface WebhookCardProps {
  webhook: Webhook
  spaceId: string
  onEdit: () => void
  onDelete: () => void
}

function WebhookCard({ webhook, spaceId, onEdit, onDelete }: WebhookCardProps) {
  const [hovered, setHovered] = useState(false)
  const [showLogsTooltip, setShowLogsTooltip] = useState(false)

  return (
    <div
      className="relative flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowLogsTooltip(false) }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate mb-0.5">
          {webhook.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">
          {webhook.endpoint}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            webhook.activated
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
          }`}>
            {webhook.activated ? 'Active' : 'Inactive'}
          </span>
          {webhook.actions.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium">
              {eventsSummary(webhook.actions)}
            </span>
          )}
        </div>
      </div>

      {/* Hover actions */}
      <div className={`flex items-center gap-1 transition-opacity duration-150 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
        {/* View logs */}
        <div className="relative">
          {showLogsTooltip && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded whitespace-nowrap pointer-events-none">
              View logs
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
            </div>
          )}
          <a
            href={`/spaces/${spaceId}/settings/webhooks/logs?webhook_id=${webhook.id}`}
            onMouseEnter={() => setShowLogsTooltip(true)}
            onMouseLeave={() => setShowLogsTooltip(false)}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <History className="w-4 h-4" />
          </a>
        </div>

        {/* Edit */}
        <button
          onClick={onEdit}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Webhook form (inside RightSidebar) ───────────────────────────────────────

interface WebhookFormProps {
  spaceId: string
  webhook: Webhook | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}

function WebhookForm({ spaceId, webhook, open, onClose, onSaved }: WebhookFormProps) {
  const [name, setName] = useState('')
  const [endpoint, setEndpoint] = useState('')
  const [description, setDescription] = useState('')
  const [secret, setSecret] = useState('')
  const [actions, setActions] = useState<string[]>([])
  const [activated, setActivated] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Reset form when webhook changes
  useEffect(() => {
    setName(webhook?.name ?? '')
    setEndpoint(webhook?.endpoint ?? '')
    setDescription(webhook?.description ?? '')
    setSecret(webhook?.secret ?? '')
    setActions(webhook?.actions ?? [])
    setActivated(webhook?.activated ?? true)
    setError(null)
    setExpandedGroups(new Set())
  }, [webhook, open])

  function toggleTrigger(value: string) {
    setActions((prev) => prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value])
  }

  function toggleGroup(group: TriggerGroup) {
    const vals = group.triggers.map((t) => t.value)
    const allSel = vals.every((v) => actions.includes(v))
    setActions((prev) => allSel ? prev.filter((a) => !vals.includes(a)) : [...new Set([...prev, ...vals])])
  }

  function toggleExpandGroup(label: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  async function handleSave() {
    if (!name.trim() || !endpoint.trim()) { setError('Name and endpoint are required'); return }
    setSaving(true); setError(null)
    try {
      const url = webhook ? `/api/admin/spaces/${spaceId}/webhooks/${webhook.id}` : `/api/admin/spaces/${spaceId}/webhooks`
      const res = await fetch(url, {
        method: webhook ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), endpoint: endpoint.trim(), description: description.trim() || null, secret: secret.trim() || null, actions, activated }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message ?? 'Failed to save') }
      onSaved()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!webhook) return
    await fetch(`/api/admin/spaces/${spaceId}/webhooks/${webhook.id}`, { method: 'DELETE' })
    onSaved()
  }

  return (
    <>
      <RightSidebar
        open={open}
        onClose={onClose}
        width="w-[480px]"
        header={
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {webhook ? 'Edit Webhook' : 'New Webhook'}
          </h2>
        }
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              {webhook && (
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

        {/* Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Webhook"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Active toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Active</label>
          <Toggle checked={activated} onChange={setActivated} />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Endpoint URL */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Endpoint URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://example.com/webhook"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Webhook secret */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Webhook secret</label>
          <input
            type="text"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Sent as Webhook-Secret header"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Triggers */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Triggers <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setExpandedGroups(new Set(TRIGGER_GROUPS.map((g) => g.label)))}
                className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={() => setActions([...ALL_TRIGGERS])}
                className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
              >
                Select All Events
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Choose at least one event that should trigger your webhook.
          </p>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {TRIGGER_GROUPS.map((group, gi) => {
              const vals = group.triggers.map((t) => t.value)
              const selectedCount = vals.filter((v) => actions.includes(v)).length
              const allSelected = selectedCount === vals.length
              const expanded = expandedGroups.has(group.label)

              return (
                <div key={group.label} className={gi > 0 ? 'border-t border-gray-200 dark:border-gray-700' : ''}>
                  <div className="flex items-center gap-2 px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = selectedCount > 0 && !allSelected }}
                      onChange={() => toggleGroup(group)}
                      className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 shrink-0"
                    />
                    <button
                      type="button"
                      onClick={() => toggleExpandGroup(group.label)}
                      className="flex-1 flex items-center justify-between text-sm text-gray-700 dark:text-gray-300"
                    >
                      <span className="flex items-center gap-1.5">
                        <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                        {group.label}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        selectedCount > 0
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {selectedCount} of {vals.length} event{vals.length !== 1 ? 's' : ''}
                      </span>
                    </button>
                  </div>
                  {expanded && (
                    <div className="px-10 pb-2.5 grid grid-cols-2 gap-y-1">
                      {group.triggers.map((t) => (
                        <label key={t.value} className="flex items-center gap-2 py-0.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={actions.includes(t.value)}
                            onChange={() => toggleTrigger(t.value)}
                            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{t.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </RightSidebar>

      <ConfirmModal
        open={confirmDelete}
        title="Delete Webhook"
        message={`Are you sure you want to delete "${webhook?.name ?? ''}"?`}
        confirmLabel="Delete"
        dangerous
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WebhooksPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params)
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Webhook | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/admin/spaces/${spaceId}/webhooks`)
    const data = await res.json()
    setWebhooks(data.webhooks ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [spaceId])

  function openNew() { setSelectedWebhook(null); setPanelOpen(true) }
  function openEdit(w: Webhook) { setSelectedWebhook(w); setPanelOpen(true) }

  async function handleDelete(w: Webhook) {
    await fetch(`/api/admin/spaces/${spaceId}/webhooks/${w.id}`, { method: 'DELETE' })
    setDeleteTarget(null)
    load()
  }

  function handleSaved() { setPanelOpen(false); load() }

  return (
    <div className="max-w-3xl px-10 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Webhooks</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Notify external services when content changes.
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Webhook
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900">
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-36 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-4 w-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                </div>
                <div className="h-3 w-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                <div className="flex gap-1">
                  <div className="h-4 w-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-4 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-4 w-28 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                </div>
              </div>
              <div className="w-7 h-7 bg-gray-100 dark:bg-gray-800 rounded animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <p className="text-sm text-gray-400 mb-3">No webhooks configured yet.</p>
          <button onClick={openNew} className="text-sm text-teal-600 dark:text-teal-400 hover:underline">
            Add your first webhook
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((w) => (
            <WebhookCard
              key={w.id}
              webhook={w}
              spaceId={spaceId}
              onEdit={() => openEdit(w)}
              onDelete={() => setDeleteTarget(w)}
            />
          ))}
        </div>
      )}

      <WebhookForm
        spaceId={spaceId}
        webhook={selectedWebhook}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onSaved={handleSaved}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Webhook"
        message={`Are you sure you want to delete "${deleteTarget?.name ?? ''}"?`}
        confirmLabel="Delete"
        dangerous
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
