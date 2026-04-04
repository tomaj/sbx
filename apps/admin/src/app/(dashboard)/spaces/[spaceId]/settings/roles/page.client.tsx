'use client'

import { useState, useEffect, use, useRef } from 'react'
import { Plus, Settings, Trash2, ChevronDown, ChevronRight, Lock, X, Check } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { RightSidebar } from '@/components/ui/right-sidebar'
import { UnsavedChangesModal } from '@/components/ui/unsaved-changes-modal'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { PageLayout } from '@/components/ui/page-layout'
import { useApi } from '@/lib/swr'
import type { SpaceRole, Datasource, AssetFolder } from '@sbx/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DefaultRole {
  role: string
  subtitle: string
  user_count: number
}

// ─── Permission definitions ───────────────────────────────────────────────────

const DEFAULT_ROLES: { role: string; subtitle: string }[] = [
  { role: 'Admin', subtitle: 'Can manage users and create, update projects.' },
  { role: 'Editor', subtitle: 'Can create, update and delete content.' },
]

interface PermissionDef {
  key: string
  label: string
  alwaysOn?: boolean
  isDeny?: boolean
}

interface PermissionGroup {
  label: string
  permissions: PermissionDef[]
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: 'Content & Editor',
    permissions: [
      { key: 'read_stories', label: 'Allow reading content', alwaysOn: true },
      { key: 'save_stories', label: 'Allow saving content' },
      { key: 'publish_stories', label: 'Allow publishing stories' },
      { key: 'unpublish_stories', label: 'Allow unpublishing stories' },
      { key: 'publish_folders', label: 'Allow publishing folders' },
      { key: 'unpublish_folders', label: 'Allow unpublishing folders' },
      { key: 'deploy_pipelines', label: 'Allow deploying pipelines' },
      { key: 'delete_content', label: 'Allow deleting content' },
      { key: 'edit_image', label: 'Deny access to image editor', isDeny: true },
      { key: 'view_composer', label: 'Deny access to visual editor', isDeny: true },
      { key: 'change_alternate_group', label: 'Deny changing alternates group', isDeny: true },
      { key: 'move_story', label: 'Deny moving a story', isDeny: true },
      { key: 'edit_story_slug', label: 'Deny changing the slug of a story', isDeny: true },
      { key: 'force_release', label: 'Force user to use a release' },
      { key: 'allow_private_releases', label: 'Allow full access to private releases' },
      { key: 'hide_content_unauthorized', label: 'Hide content if unauthorized' },
      { key: 'hide_folders_unauthorized', label: 'Hide folders if unauthorized' },
      { key: 'access_draft_json', label: 'Allow accessing Draft JSON' },
      { key: 'access_published_json', label: 'Allow accessing Published JSON' },
    ],
  },
  {
    label: 'Tags',
    permissions: [
      { key: 'manage_tags', label: 'Allow managing tags' },
    ],
  },
]

function isPermissionEnabled(permissions: string[], def: PermissionDef): boolean {
  if (def.alwaysOn) return true
  if (def.isDeny) return !permissions.includes(def.key)
  return permissions.includes(def.key)
}

function togglePermission(permissions: string[], def: PermissionDef, checked: boolean): string[] {
  if (def.alwaysOn) return permissions
  if (def.isDeny) {
    // checked = deny active = key NOT in array
    if (checked) return permissions.filter((p) => p !== def.key)
    return permissions.includes(def.key) ? permissions : [...permissions, def.key]
  }
  if (checked) return permissions.includes(def.key) ? permissions : [...permissions, def.key]
  return permissions.filter((p) => p !== def.key)
}

// ─── PermissionSelector ───────────────────────────────────────────────────────
// Generic component for allowed/blocked items with mode toggle + chip display

interface SelectOption { id: number; name: string }

interface PermissionSelectorProps {
  mode: 'allowed' | 'blocked'
  onModeChange: (mode: 'allowed' | 'blocked') => void
  selectedIds: number[]
  onSelectedChange: (ids: number[]) => void
  options: SelectOption[]
  allLabel: string
  searchPlaceholder?: string
}

function PermissionSelector({
  mode, onModeChange, selectedIds, onSelectedChange,
  options, allLabel, searchPlaceholder = 'Search...',
}: PermissionSelectorProps) {
  const [modeOpen, setModeOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const modeRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (modeRef.current && !modeRef.current.contains(e.target as Node)) setModeOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) { setSearchOpen(false); setQuery('') }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = options.filter(
    (o) => !selectedIds.includes(o.id) && o.name.toLowerCase().includes(query.toLowerCase()),
  )
  const selectedOptions = options.filter((o) => selectedIds.includes(o.id))

  function remove(id: number) { onSelectedChange(selectedIds.filter((x) => x !== id)) }
  function add(id: number) { onSelectedChange([...selectedIds, id]); setQuery('') }

  return (
    <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-visible min-h-[44px]">
      {/* Mode toggle */}
      <div ref={modeRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setModeOpen((v) => !v)}
          className="flex items-center gap-2 px-3 h-full text-sm text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 whitespace-nowrap"
        >
          <Lock className="w-3.5 h-3.5" />
          {mode === 'allowed' ? 'Allowed items' : 'Blocked items'}
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        {modeOpen && (
          <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
            {(['allowed', 'blocked'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { onModeChange(m); setModeOpen(false) }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 ${mode === m ? 'text-teal-600 dark:text-teal-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
              >
                {mode === m && <Check className="w-3.5 h-3.5" />}
                {m === 'allowed' ? 'Allowed items' : 'Blocked items'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selection area */}
      <div ref={searchRef} className="relative flex-1 flex flex-wrap items-center gap-1.5 px-3 py-2 min-w-0">
        {selectedOptions.length === 0 ? (
          <span
            className="text-sm text-teal-600 dark:text-teal-400 cursor-pointer flex-1"
            onClick={() => setSearchOpen(true)}
          >
            {allLabel}
          </span>
        ) : (
          <>
            {selectedOptions.map((o) => (
              <span key={o.id} className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-700 dark:text-gray-300">
                {o.name}
                <button type="button" onClick={() => remove(o.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </>
        )}

        {/* Add button / chevron */}
        <button
          type="button"
          onClick={() => { setSearchOpen(true) }}
          className="ml-auto shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <ChevronDown className="w-4 h-4" />
        </button>

        {/* Dropdown */}
        {searchOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
            <div className="p-2 border-b border-gray-100 dark:border-gray-800">
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full px-2 py-1 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400">No items found</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => add(o.id)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {o.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── TagInput ─────────────────────────────────────────────────────────────────

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

function TagInput({ tags, onChange, placeholder = 'Add tag...' }: TagInputProps) {
  const [input, setInput] = useState('')

  function add() {
    const val = input.trim()
    if (val && !tags.includes(val)) { onChange([...tags, val]) }
    setInput('')
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 min-h-[40px] px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg">
      {tags.map((t) => (
        <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-700 dark:text-gray-300">
          {t}
          <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
        onBlur={add}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[80px] text-sm bg-transparent focus:outline-none text-gray-700 dark:text-gray-300 placeholder:text-gray-400"
      />
    </div>
  )
}

// ─── Role form (RightSidebar) ─────────────────────────────────────────────────

type PermTab = 'general' | 'content' | 'blocks' | 'datasources' | 'assets'

interface FormState {
  name: string
  subtitle: string
  permissions: string[]
  allowedLanguages: string[]
  blockedLanguages: string[]
  languageMode: 'allowed' | 'blocked'
  allowedPaths: number[]
  blockedPaths: number[]
  pathMode: 'allowed' | 'blocked'
  restrictAccess: boolean
  datasourceIds: number[]
  blockedDatasourceIds: number[]
  datasourceMode: 'allowed' | 'blocked'
  assetFolderIds: number[]
  blockedAssetFolderIds: number[]
  assetMode: 'allowed' | 'blocked'
  hideAssets: boolean
  grantBlockLibrary: boolean
}

interface RoleFormProps {
  spaceId: string
  role: SpaceRole | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}

function RoleForm({ spaceId, role, open, onClose, onSaved }: RoleFormProps) {
  const [form, setForm] = useState<FormState>({
    name: '', subtitle: '', permissions: ['read_stories'],
    allowedLanguages: [], blockedLanguages: [], languageMode: 'allowed',
    allowedPaths: [], blockedPaths: [], pathMode: 'allowed',
    restrictAccess: false,
    datasourceIds: [], blockedDatasourceIds: [], datasourceMode: 'allowed',
    assetFolderIds: [], blockedAssetFolderIds: [], assetMode: 'allowed',
    hideAssets: false,
    grantBlockLibrary: false,
  })
  const [permTab, setPermTab] = useState<PermTab>('general')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Content & Editor']))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const { showModal: showUnsavedModal, handleConfirm: confirmUnsaved, handleCancel: cancelUnsaved } = useUnsavedChanges(isDirty)
  const [datasources, setDatasources] = useState<Datasource[]>([])
  const [assetFolders, setAssetFolders] = useState<AssetFolder[]>([])

  useEffect(() => {
    if (!open) return
    const perms = role?.permissions ?? ['read_stories']
    setForm({
      name: role?.role ?? '',
      subtitle: role?.subtitle ?? '',
      permissions: perms,
      allowedLanguages: role?.allowed_languages ?? [],
      blockedLanguages: role?.blocked_languages ?? [],
      languageMode: (role?.blocked_languages?.length ?? 0) > 0 ? 'blocked' : 'allowed',
      allowedPaths: role?.allowed_paths ?? [],
      blockedPaths: role?.blocked_paths ?? [],
      pathMode: (role?.blocked_paths?.length ?? 0) > 0 ? 'blocked' : 'allowed',
      restrictAccess: perms.includes('prioritize_content_access_restriction'),
      datasourceIds: role?.datasource_ids ?? [],
      blockedDatasourceIds: role?.blocked_datasource_ids ?? [],
      datasourceMode: (role?.blocked_datasource_ids?.length ?? 0) > 0 ? 'blocked' : 'allowed',
      assetFolderIds: role?.asset_folder_ids ?? [],
      blockedAssetFolderIds: role?.blocked_asset_folder_ids ?? [],
      assetMode: (role?.blocked_asset_folder_ids?.length ?? 0) > 0 ? 'blocked' : 'allowed',
      hideAssets: perms.includes('hide_assets'),
      grantBlockLibrary: perms.includes('manage_components'),
    })
    setPermTab('general')
    setExpandedGroups(new Set(['Content & Editor']))
    setError(null)
    setIsDirty(false)
  }, [role, open])

  // Fetch supporting data once when form opens
  useEffect(() => {
    if (!open) return
    fetch(`/api/admin/spaces/${spaceId}/datasources`)
      .then((r) => r.json())
      .then((d) => setDatasources(d.datasources ?? []))
      .catch(() => {})
    fetch(`/api/admin/spaces/${spaceId}/assets/folders`)
      .then((r) => r.json())
      .then((d) => setAssetFolders(d.asset_folders ?? []))
      .catch(() => {})
  }, [open, spaceId])

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
    setIsDirty(true)
  }

  function toggleGroup(label: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  function buildPayload() {
    // Merge special permissions into permissions array
    let perms = form.permissions.filter(
      (p) => p !== 'prioritize_content_access_restriction' && p !== 'hide_assets' && p !== 'manage_components',
    )
    if (form.restrictAccess) perms = [...perms, 'prioritize_content_access_restriction']
    if (form.hideAssets) perms = [...perms, 'hide_assets']
    if (form.grantBlockLibrary) perms = [...perms, 'manage_components']

    return {
      role: form.name.trim(),
      subtitle: form.subtitle.trim() || null,
      permissions: perms,
      allowed_languages: form.languageMode === 'allowed' ? form.allowedLanguages : [],
      blocked_languages: form.languageMode === 'blocked' ? form.blockedLanguages : [],
      allowed_paths: form.pathMode === 'allowed' ? form.allowedPaths : [],
      blocked_paths: form.pathMode === 'blocked' ? form.blockedPaths : [],
      datasource_ids: form.datasourceMode === 'allowed' ? form.datasourceIds : [],
      blocked_datasource_ids: form.datasourceMode === 'blocked' ? form.blockedDatasourceIds : [],
      asset_folder_ids: form.assetMode === 'allowed' ? form.assetFolderIds : [],
      blocked_asset_folder_ids: form.assetMode === 'blocked' ? form.blockedAssetFolderIds : [],
    }
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Role name is required'); return }
    setSaving(true); setError(null)
    try {
      const url = role
        ? `/api/admin/spaces/${spaceId}/roles/${role.id}`
        : `/api/admin/spaces/${spaceId}/roles`
      const res = await fetch(url, {
        method: role ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message ?? 'Failed to save') }
      setIsDirty(false)
      onSaved()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!role) return
    await fetch(`/api/admin/spaces/${spaceId}/roles/${role.id}`, { method: 'DELETE' })
    onSaved()
  }

  const PERM_TABS: { key: PermTab; label: string }[] = [
    { key: 'general', label: 'General' },
    { key: 'content', label: 'Content' },
    { key: 'blocks', label: 'Blocks' },
    { key: 'datasources', label: 'Datasources' },
    { key: 'assets', label: 'Assets' },
  ]

  const dsOptions: SelectOption[] = datasources.map((d) => ({ id: d.id, name: d.name }))
  const folderOptions: SelectOption[] = assetFolders.map((f) => ({ id: f.id, name: f.name }))

  const activeLangTags = form.languageMode === 'allowed' ? form.allowedLanguages : form.blockedLanguages
  const setLangTags = (tags: string[]) =>
    form.languageMode === 'allowed' ? set('allowedLanguages', tags) : set('blockedLanguages', tags)

  return (
    <>
      <RightSidebar
        open={open}
        onClose={onClose}
        width="w-[600px]"
        header={
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {role ? 'Edit Role' : 'New Role'}
          </h2>
        }
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              {role && (
                <button type="button" onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 dark:text-red-400">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                Cancel
              </button>
              <button type="button" onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg transition-colors">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        }
      >
        {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

        {/* Name + Description */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Role name <span className="text-red-500">*</span>
            </label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
              placeholder="My Role"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Short Description
            </label>
            <input type="text" value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
        </div>

        {role && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {role.user_count} user{role.user_count !== 1 ? 's' : ''} with this role
          </p>
        )}

        {/* Permissions */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Permissions</h3>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 gap-0">
            {PERM_TABS.map((tab) => (
              <button key={tab.key} type="button" onClick={() => setPermTab(tab.key)}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  permTab === tab.key
                    ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── General tab ── */}
          {permTab === 'general' && (
            <div className="space-y-2">
              {PERMISSION_GROUPS.map((group) => {
                const expanded = expandedGroups.has(group.label)
                const checkedCount = group.permissions.filter((p) => isPermissionEnabled(form.permissions, p)).length
                return (
                  <div key={group.label} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <button type="button" onClick={() => toggleGroup(group.label)}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800">
                      <span className="flex items-center gap-2">
                        {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                        {group.label}
                      </span>
                      <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                        {checkedCount}/{group.permissions.length}
                      </span>
                    </button>
                    {expanded && (
                      <div className="px-4 py-3 space-y-2.5 bg-white dark:bg-gray-900">
                        {group.permissions.map((def) => {
                          const checked = isPermissionEnabled(form.permissions, def)
                          return (
                            <label key={def.key} className={`flex items-center gap-3 cursor-pointer ${def.alwaysOn ? 'opacity-60' : ''}`}>
                              <input type="checkbox" checked={checked} disabled={def.alwaysOn}
                                onChange={(e) => set('permissions', togglePermission(form.permissions, def, e.target.checked))}
                                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 shrink-0" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">{def.label}</span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Content tab ── */}
          {permTab === 'content' && (
            <div className="space-y-6">
              {/* Languages */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Languages</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Add languages the user should have access to. If no item is selected the user has rights to edit all content.
                </p>
                <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-visible min-h-[44px]">
                  {/* Mode */}
                  <LanguageModeToggle mode={form.languageMode} onChange={(m) => {
                    set('languageMode', m)
                    set('allowedLanguages', [])
                    set('blockedLanguages', [])
                  }} />
                  <div className="flex-1 px-3 py-2">
                    <TagInput
                      tags={activeLangTags}
                      onChange={setLangTags}
                      placeholder="Add language code (e.g. en, sk)..."
                    />
                  </div>
                </div>
              </div>

              {/* Folder/Content item permissions */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Folder/Content item permissions</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Add folders or content items the user should have access to. If no item is selected, all content will be editable by the user.
                </p>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {form.pathMode === 'allowed'
                        ? form.allowedPaths.length === 0 ? 'All content (no restrictions)' : `${form.allowedPaths.length} allowed path${form.allowedPaths.length !== 1 ? 's' : ''}`
                        : form.blockedPaths.length === 0 ? 'No blocked paths' : `${form.blockedPaths.length} blocked path${form.blockedPaths.length !== 1 ? 's' : ''}`}
                    </span>
                    {(form.allowedPaths.length > 0 || form.blockedPaths.length > 0) && (
                      <button type="button" onClick={() => { set('allowedPaths', []); set('blockedPaths', []) }}
                        className="text-xs text-red-500 hover:text-red-600">
                        Clear
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Folder/story path management is configured via the content browser.
                  </p>
                </div>

                {/* Restrict access checkbox */}
                <label className="flex items-start gap-3 mt-3 cursor-pointer">
                  <input type="checkbox" checked={form.restrictAccess}
                    onChange={(e) => set('restrictAccess', e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500 shrink-0" />
                  <div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Restrict access when roles conflict with overlapping permissions.
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      When this option is enabled, the restriction overrides rules with allowed folders/stories.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* ── Blocks tab ── */}
          {permTab === 'blocks' && (
            <div className="space-y-6">
              {/* Grant access toggle */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Grant access to the Block library</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Users associated with this role can create, move, and edit blocks.
                  </p>
                </div>
                <Toggle checked={form.grantBlockLibrary} onChange={(v) => set('grantBlockLibrary', v)} />
              </div>

              {form.grantBlockLibrary && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
                  <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Library access management</h5>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    If no item is selected, the user has access to all blocks and folders.
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Block-level access management is configured via the Block Library.
                  </p>
                </div>
              )}

              {/* Manage block access in editor */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Manage block access in the editor</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Block and field access management in the story editor requires block library configuration.
                </p>
              </div>
            </div>
          )}

          {/* ── Datasources tab ── */}
          {permTab === 'datasources' && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Datasource permissions</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Add datasources the user should have access to. If no item is selected the user has rights to edit all datasources.
              </p>
              <PermissionSelector
                mode={form.datasourceMode}
                onModeChange={(m) => {
                  set('datasourceMode', m)
                  set('datasourceIds', [])
                  set('blockedDatasourceIds', [])
                }}
                selectedIds={form.datasourceMode === 'allowed' ? form.datasourceIds : form.blockedDatasourceIds}
                onSelectedChange={(ids) =>
                  form.datasourceMode === 'allowed'
                    ? set('datasourceIds', ids)
                    : set('blockedDatasourceIds', ids)
                }
                options={dsOptions}
                allLabel="All datasources"
                searchPlaceholder="Search datasources..."
              />
            </div>
          )}

          {/* ── Assets tab ── */}
          {permTab === 'assets' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Asset Folder Permissions</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Manage access to selected asset folders for this role. You can grant or restrict access by specifying allowed and blocked folders.
                </p>
                <PermissionSelector
                  mode={form.assetMode}
                  onModeChange={(m) => {
                    set('assetMode', m)
                    set('assetFolderIds', [])
                    set('blockedAssetFolderIds', [])
                  }}
                  selectedIds={form.assetMode === 'allowed' ? form.assetFolderIds : form.blockedAssetFolderIds}
                  onSelectedChange={(ids) =>
                    form.assetMode === 'allowed'
                      ? set('assetFolderIds', ids)
                      : set('blockedAssetFolderIds', ids)
                  }
                  options={folderOptions}
                  allLabel="Search for asset folders"
                  searchPlaceholder="Search folders..."
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={form.hideAssets}
                  onChange={(e) => set('hideAssets', e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500 shrink-0" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Hide assets and assets folders (including their subfolders) the role doesn&apos;t have permission to upload to
                </span>
              </label>
            </div>
          )}
        </div>
      </RightSidebar>

      <ConfirmModal
        open={confirmDelete}
        title="Delete Role"
        message={`Are you sure you want to delete the role "${role?.role ?? ''}"? Users with this role will lose these permissions.`}
        confirmLabel="Delete"
        dangerous
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <UnsavedChangesModal open={showUnsavedModal} onConfirm={confirmUnsaved} onCancel={cancelUnsaved} />
    </>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${checked ? 'bg-teal-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

function LanguageModeToggle({ mode, onChange }: { mode: 'allowed' | 'blocked'; onChange: (m: 'allowed' | 'blocked') => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 h-full text-sm text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 whitespace-nowrap">
        <Lock className="w-3.5 h-3.5" />
        {mode === 'allowed' ? 'Allowed items' : 'Blocked items'}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          {(['allowed', 'blocked'] as const).map((m) => (
            <button key={m} type="button" onClick={() => { onChange(m); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 ${mode === m ? 'text-teal-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
              {mode === m && <Check className="w-3.5 h-3.5" />}
              {m === 'allowed' ? 'Allowed items' : 'Blocked items'}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Role rows ─────────────────────────────────────────────────────────────────

function DefaultRoleRow({ role, userCount }: { role: typeof DEFAULT_ROLES[0]; userCount: number }) {
  return (
    <div className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{role.role}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium">
            Default role
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{role.subtitle}</p>
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400 shrink-0 w-28 text-right">
        {userCount} user{userCount !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

interface CustomRoleRowProps {
  role: SpaceRole
  onEdit: () => void
  onDelete: () => void
}

function CustomRoleRow({ role, onEdit, onDelete }: CustomRoleRowProps) {
  const [hovered, setHovered] = useState(false)
  return (
    <div className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{role.role}</p>
        {role.subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{role.subtitle}</p>}
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400 shrink-0 w-28 text-right">
        {role.user_count} user{role.user_count !== 1 ? 's' : ''}
      </div>
      <div className={`flex items-center gap-1 ml-2 transition-opacity duration-150 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
        <button onClick={onEdit} className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <Settings className="w-4 h-4" />
        </button>
        <button onClick={onDelete} className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface RolesApiResponse {
  default_roles: DefaultRole[]
  space_roles: SpaceRole[]
}

export default function RolesPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params)
  const [selectedRole, setSelectedRole] = useState<SpaceRole | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SpaceRole | null>(null)

  const { data, isLoading: loading, mutate } = useApi<RolesApiResponse>(`/api/admin/spaces/${spaceId}/roles`)

  const defaultRoleCounts: Record<string, number> = { Admin: 0, Editor: 0 }
  for (const dr of data?.default_roles ?? []) {
    defaultRoleCounts[dr.role] = dr.user_count ?? 0
  }
  const spaceRoles = data?.space_roles ?? []

  function openNew() { setSelectedRole(null); setPanelOpen(true) }
  function openEdit(r: SpaceRole) { setSelectedRole(r); setPanelOpen(true) }

  async function handleDelete(r: SpaceRole) {
    await fetch(`/api/admin/spaces/${spaceId}/roles/${r.id}`, { method: 'DELETE' })
    setDeleteTarget(null)
    mutate()
  }

  return (
    <PageLayout
      title="Roles"
      description="Roles are for giving certain permissions to various types of users in your space. It gives the space owner and admins greater control over who can publish what, especially for bigger projects."
      action={
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Add new role
        </button>
      }
    >
      {/* Table header */}
      <div className="flex items-center px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        <div className="flex-1">Name</div>
        <div className="w-28 text-right mr-10">Users</div>
      </div>

      {loading ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  {i < 2 && <div className="h-4 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />}
                </div>
                <div className="h-3 w-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </div>
              <div className="h-4 w-14 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          {/* Default roles always shown */}
          {DEFAULT_ROLES.map((r) => (
            <DefaultRoleRow key={r.role} role={r} userCount={defaultRoleCounts[r.role] ?? 0} />
          ))}

          {/* Custom roles */}
          {spaceRoles.map((r) => (
            <CustomRoleRow key={r.id} role={r} onEdit={() => openEdit(r)} onDelete={() => setDeleteTarget(r)} />
          ))}

          {spaceRoles.length === 0 && (
            <div className="py-8 text-center border-t border-gray-100 dark:border-gray-800">
              <p className="text-sm text-gray-400">No custom roles yet.</p>
              <button onClick={openNew} className="mt-2 text-sm text-teal-600 dark:text-teal-400 hover:underline">
                Add your first role
              </button>
            </div>
          )}
        </div>
      )}

      <RoleForm
        spaceId={spaceId}
        role={selectedRole}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onSaved={() => { setPanelOpen(false); mutate() }}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Role"
        message={`Are you sure you want to delete the role "${deleteTarget?.role ?? ''}"? Users with this role will lose these permissions.`}
        confirmLabel="Delete"
        dangerous
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageLayout>
  )
}
