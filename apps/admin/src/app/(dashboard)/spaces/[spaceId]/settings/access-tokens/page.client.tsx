'use client'

import { useState, useEffect, use } from 'react'
import { Plus, Copy, Settings, Trash2, Check } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { RightSidebar } from '@/components/ui/right-sidebar'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { UnsavedChangesModal } from '@/components/ui/unsaved-changes-modal'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import type { ApiToken, Branch } from '@sbx/types'

// ─── Access level badge ───────────────────────────────────────────────────────

function AccessBadge({ access }: { access: string }) {
  const isPublic = access === 'public'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
      isPublic
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
    }`}>
      {isPublic ? 'Public' : 'Preview'}
    </span>
  )
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      onClick={handleCopy}
      title="Copy token"
      className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </button>
  )
}

// ─── Token Form (right sidebar) ───────────────────────────────────────────────

interface TokenFormProps {
  spaceId: string
  token: ApiToken | null
  branches: Branch[]
  open: boolean
  onClose: () => void
  onSaved: () => void
}

function TokenForm({ spaceId, token, branches, open, onClose, onSaved }: TokenFormProps) {
  const [access, setAccess] = useState<'public' | 'private'>('public')
  const [name, setName] = useState('')
  const [branchId, setBranchId] = useState<string | null>(null)
  const [minCache, setMinCache] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const { showModal: showUnsavedModal, handleConfirm: confirmUnsaved, handleCancel: cancelUnsaved } = useUnsavedChanges(isDirty)

  useEffect(() => {
    setAccess((token?.access === 'private' ? 'private' : 'public') as 'public' | 'private')
    setName(token?.name ?? '')
    setBranchId(token?.branch_id != null ? String(token.branch_id) : null)
    setMinCache(token?.min_cache ?? 0)
    setError(null)
    setIsDirty(false)
  }, [token, open])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const url = token
        ? `/api/admin/spaces/${spaceId}/access-tokens/${token.id}`
        : `/api/admin/spaces/${spaceId}/access-tokens`
      const res = await fetch(url, {
        method: token ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access,
          name: name.trim() || null,
          branchId: branchId ? parseInt(branchId) : null,
          minCache,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.message ?? 'Failed to save')
      }
      onSaved()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!token) return
    await fetch(`/api/admin/spaces/${spaceId}/access-tokens/${token.id}`, { method: 'DELETE' })
    onSaved()
  }

  function copyKey() {
    if (!token) return
    navigator.clipboard.writeText(token.token).then(() => {
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 1500)
    })
  }

  const branchOptions = branches.map((b) => ({ value: String(b.id), label: b.name }))

  return (
    <>
      <RightSidebar
        open={open}
        onClose={onClose}
        width="w-[480px]"
        header={
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {token ? 'Edit Access Token' : 'New Access Token'}
          </h2>
        }
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              {token && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
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

        {/* Key (edit only) */}
        {token && (
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Key</label>
            <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
              <span className="flex-1 text-sm text-gray-600 dark:text-gray-400 font-mono truncate">
                {token.token}
              </span>
              <button
                type="button"
                onClick={copyKey}
                className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {copiedKey ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Access level */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Access level <span className="text-red-500">*</span>
          </label>
          <SelectDropdown
            value={access}
            onChange={(v) => { setAccess((v ?? 'public') as 'public' | 'private'); setIsDirty(true) }}
            options={[
              { value: 'public', label: 'Public' },
              { value: 'private', label: 'Preview' },
            ]}
          />
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setIsDirty(true) }}
            placeholder="Access token name"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Pipeline (branch) */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Pipeline</label>
          <SelectDropdown
            value={branchId}
            onChange={(v) => { setBranchId(v); setIsDirty(true) }}
            options={branchOptions}
            placeholder="Select..."
          />
        </div>

        {/* Minimum Cache TTL */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Minimum Cache TTL
          </label>
          <input
            type="number"
            min={0}
            value={minCache}
            onChange={(e) => { setMinCache(Math.max(0, parseInt(e.target.value) || 0)); setIsDirty(true) }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <p className="mt-1 text-xs text-gray-400">
            Specify how long the CDN caches the content. The default value is 0 (zero seconds).
          </p>
        </div>
      </RightSidebar>

      <ConfirmModal
        open={confirmDelete}
        title="Delete Access Token"
        message={`Are you sure you want to delete "${token?.name ?? token?.token ?? ''}"? This will break any integrations using this token.`}
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

export default function AccessTokensPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params)
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedToken, setSelectedToken] = useState<ApiToken | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ApiToken | null>(null)

  async function load() {
    setLoading(true)
    const [tokensRes, branchesRes] = await Promise.all([
      fetch(`/api/admin/spaces/${spaceId}/access-tokens`),
      fetch(`/api/admin/spaces/${spaceId}/branches`),
    ])
    const [tokensData, branchesData] = await Promise.all([tokensRes.json(), branchesRes.json()])
    setTokens(tokensData.api_keys ?? [])
    setBranches(branchesData.branches ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [spaceId])

  function openNew() { setSelectedToken(null); setPanelOpen(true) }
  function openEdit(t: ApiToken) { setSelectedToken(t); setPanelOpen(true) }
  function handleSaved() { setPanelOpen(false); load() }

  async function handleDelete(t: ApiToken) {
    await fetch(`/api/admin/spaces/${spaceId}/access-tokens/${t.id}`, { method: 'DELETE' })
    setDeleteTarget(null)
    load()
  }

  function getBranchName(branchId: number | null) {
    if (!branchId) return null
    return branches.find((b) => b.id === branchId)?.name ?? null
  }

  return (
    <div className="max-w-4xl px-10 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Access Tokens</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Access Token
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        Public access tokens are only for accessing the published version while preview tokens are for accessing the draft version. Both are read-only tokens.
      </p>

      {/* Table */}
      {loading ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Token</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Access level</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pipeline</th>
                <th className="w-32" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 space-y-1.5">
                    <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                    <div className="h-3 w-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-5 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <p className="text-sm text-gray-400 mb-3">No access tokens yet.</p>
          <button onClick={openNew} className="text-sm text-teal-600 dark:text-teal-400 hover:underline">
            Create your first token
          </button>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Token
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Access level
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Pipeline
                </th>
                <th className="w-32" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {tokens.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {t.name || '—'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                      {t.token}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <AccessBadge access={t.access} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {getBranchName(t.branch_id) ?? '——'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <CopyButton text={t.token} />
                      <button
                        onClick={() => openEdit(t)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(t)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TokenForm
        spaceId={spaceId}
        token={selectedToken}
        branches={branches}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onSaved={handleSaved}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Access Token"
        message={`Are you sure you want to delete "${deleteTarget?.name ?? deleteTarget?.token ?? ''}"? This will break any integrations using this token.`}
        confirmLabel="Delete"
        dangerous
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
