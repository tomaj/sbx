'use client'

import { useState, useEffect, use, useRef } from 'react'
import { Plus, Search, MoreHorizontal, X, ChevronDown, AlertCircle } from 'lucide-react'
import { UserAvatar } from '@/components/ui/user-avatar'

interface SpaceRole {
  id: number
  role: string
}

interface Collaborator {
  id: number
  userId: number
  role: string
  spaceRoleId: number | null
  user: {
    id: number
    firstname: string
    lastname: string
    email: string
    avatar: string | null
    disabled: boolean
  }
}

interface UserSearchResult {
  id: number
  firstname: string
  lastname: string
  email: string
  avatar: string | null
}


function RoleBadge({ role }: { role: string }) {
  if (role === 'owner') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
        Owner
      </span>
    )
  }
  if (role === 'admin') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
        Admin
      </span>
    )
  }
  return <span className="text-sm text-gray-700 dark:text-gray-300">{role}</span>
}

function StatusBadge({ disabled }: { disabled: boolean }) {
  if (disabled) {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
        Disabled
      </span>
    )
  }
  return <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
}

function AddUserPanel({
  spaceId,
  roles,
  onClose,
  onAdded,
}: {
  spaceId: string
  roles: SpaceRole[]
  onClose: () => void
  onAdded: () => void
}) {
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [roleMode, setRoleMode] = useState<'single' | 'multiple'>('single')
  // single mode: one role id string ('admin', 'editor', 'role:123')
  const [selectedRole, setSelectedRole] = useState('')
  // multiple mode: array of space role ids
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([])
  const [roleDropOpen, setRoleDropOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const roleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (search.length < 1) { setSearchResults([]); return }
      const res = await fetch(`/api/admin/spaces/${spaceId}/users/search?q=${encodeURIComponent(search)}`)
      const data = await res.json()
      setSearchResults(data.users ?? [])
      setSearchOpen(true)
    }, 200)
    return () => clearTimeout(timer)
  }, [search, spaceId])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) setRoleDropOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Single mode: built-in + custom space roles
  const singleRoleOptions = [
    { id: 'admin', label: 'Admin' },
    { id: 'editor', label: 'Editor' },
    ...roles.map((r) => ({ id: `role:${r.id}`, label: r.role })),
  ]
  // Multiple mode: ONLY custom space roles (built-in are single-assignment)
  const multipleRoleOptions = roles

  const selectedRoleLabel = singleRoleOptions.find((r) => r.id === selectedRole)?.label ?? ''

  function toggleMultiRole(id: number) {
    setSelectedRoleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const canSend = selectedUser && (
    roleMode === 'single' ? !!selectedRole : selectedRoleIds.length > 0
  )

  async function handleSend() {
    if (!canSend || !selectedUser) return
    setSaving(true)
    setError(null)
    try {
      let body: Record<string, unknown>
      if (roleMode === 'single') {
        if (selectedRole.startsWith('role:')) {
          const spaceRoleId = parseInt(selectedRole.replace('role:', ''))
          body = { userId: selectedUser.id, role: String(spaceRoleId), spaceRoleId, spaceRoleIds: [] }
        } else {
          body = { userId: selectedUser.id, role: selectedRole, spaceRoleId: null, spaceRoleIds: [] }
        }
      } else {
        // multiple: role = 'editor', spaceRoleId = null, spaceRoleIds = [...]
        body = { userId: selectedUser.id, role: 'editor', spaceRoleId: null, spaceRoleIds: selectedRoleIds }
      }
      const res = await fetch(`/api/admin/spaces/${spaceId}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message ?? 'Failed to add user')
      }
      onAdded()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/20 dark:bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add new user</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          {/* User search */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
              User <span className="text-red-500">*</span>
            </label>
            <div className="relative" ref={searchRef}>
              {selectedUser ? (
                <div className="flex items-center gap-2 w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
                  <UserAvatar name={`${selectedUser.firstname} ${selectedUser.lastname}`} src={selectedUser.avatar} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {selectedUser.firstname} {selectedUser.lastname}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{selectedUser.email}</p>
                  </div>
                  <button onClick={() => { setSelectedUser(null); setSearch('') }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                      placeholder="Add people by username or email address"
                      className="w-full px-3 py-2.5 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  {searchOpen && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => { setSelectedUser(u); setSearch(''); setSearchOpen(false) }}
                          className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors"
                        >
                          <UserAvatar name={`${u.firstname} ${u.lastname}`} src={u.avatar} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {u.firstname} {u.lastname}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Roles */}
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Roles <span className="text-red-500">*</span>
            </p>
            <div className="flex items-center gap-6 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="roleMode"
                  checked={roleMode === 'single'}
                  onChange={() => { setRoleMode('single'); setSelectedRoleIds([]) }}
                  className="w-4 h-4 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Single role</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="roleMode"
                  checked={roleMode === 'multiple'}
                  onChange={() => { setRoleMode('multiple'); setSelectedRole('') }}
                  className="w-4 h-4 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Multiple roles</span>
              </label>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Choose role <span className="text-red-500">*</span>
              </p>

              {roleMode === 'single' ? (
                <div className="relative" ref={roleRef}>
                  <button
                    type="button"
                    onClick={() => setRoleDropOpen((o) => !o)}
                    className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-left focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <span className={selectedRoleLabel ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}>
                      {selectedRoleLabel || 'Choose...'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </button>
                  {roleDropOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                      {singleRoleOptions.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => { setSelectedRole(opt.id); setRoleDropOpen(false) }}
                          className="w-full text-left px-4 py-3 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Multiple mode: checkboxes, only custom space roles */
                <div className="space-y-1">
                  {multipleRoleOptions.length === 0 ? (
                    <p className="text-sm text-gray-400">No custom roles defined for this space.</p>
                  ) : (
                    multipleRoleOptions.map((r) => (
                      <label key={r.id} className="flex items-center gap-3 px-1 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedRoleIds.includes(r.id)}
                          onChange={() => toggleMultiRole(r.id)}
                          className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                        <span className="text-sm text-gray-900 dark:text-gray-100">{r.role}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!canSend || saving}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {saving ? 'Adding...' : 'Send invite'}
          </button>
        </div>
      </div>
    </div>
  )
}

function MemberMenu({ member, spaceId, onUpdated }: { member: Collaborator; spaceId: string; onUpdated: () => void }) {
  const [open, setOpen] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleRemove() {
    setRemoving(true)
    await fetch(`/api/admin/spaces/${spaceId}/collaborators/${member.id}`, { method: 'DELETE' })
    setRemoving(false)
    setOpen(false)
    onUpdated()
  }

  async function handleToggleDisable() {
    setToggling(true)
    await fetch(`/api/admin/users/${member.userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disabled: !member.user.disabled }),
    })
    setToggling(false)
    setOpen(false)
    onUpdated()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
          <button
            onClick={handleToggleDisable}
            disabled={toggling}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {member.user.disabled ? 'Enable user' : 'Disable user'}
          </button>
          <button
            onClick={handleRemove}
            disabled={removing}
            className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
          >
            {removing ? 'Removing...' : 'Remove from space'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function UsersPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params)

  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [roles, setRoles] = useState<SpaceRole[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddPanel, setShowAddPanel] = useState(false)

  async function load() {
    setLoading(true)
    const [colRes, rolesRes] = await Promise.all([
      fetch(`/api/admin/spaces/${spaceId}/collaborators`),
      fetch(`/api/admin/spaces/${spaceId}/roles`),
    ])
    const colData = await colRes.json()
    const rolesData = await rolesRes.json()
    setCollaborators(colData.collaborators ?? [])
    setRoles((rolesData.space_roles ?? []).map((r: any) => ({ id: r.id, role: r.role })))
    setLoading(false)
  }

  useEffect(() => { load() }, [spaceId])

  const active = collaborators.filter((c) => !c.user.disabled)
  const filtered = collaborators.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.user.firstname.toLowerCase().includes(q) ||
      c.user.lastname.toLowerCase().includes(q) ||
      c.user.email.toLowerCase().includes(q)
    )
  })

  function getRoleLabel(c: Collaborator) {
    if (c.spaceRoleId) {
      const sr = roles.find((r) => r.id === c.spaceRoleId)
      return sr?.role ?? c.role
    }
    return c.role
  }

  return (
    <div className="max-w-3xl px-10 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Users</h1>
        <button
          onClick={() => setShowAddPanel(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add new user
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-3 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Space Users</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{loading ? '—' : collaborators.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Active Users</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{loading ? '—' : active.length}</p>
          </div>
        </div>
      </div>

      {/* Tab */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-5">
        <div className="flex gap-6">
          <button className="pb-3 text-sm font-medium text-teal-700 dark:text-teal-400 border-b-2 border-teal-700 dark:border-teal-400">
            Active ({loading ? '…' : active.length})
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-40" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-56" />
              </div>
              <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-20" />
              <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-16" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Header row */}
          <div className="grid grid-cols-[1fr_140px_100px_40px] gap-4 px-0 pb-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</p>
            <span />
          </div>

          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No users found.</p>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-[1fr_140px_100px_40px] gap-4 items-center py-3 border-b border-gray-100 dark:border-gray-800"
              >
                {/* Name */}
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar name={`${c.user.firstname} ${c.user.lastname}`} src={c.user.avatar} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {c.user.firstname} {c.user.lastname}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.user.email}</p>
                  </div>
                </div>

                {/* Role */}
                <div>
                  <RoleBadge role={getRoleLabel(c)} />
                </div>

                {/* Status */}
                <div>
                  <StatusBadge disabled={c.user.disabled} />
                </div>

                {/* Actions */}
                <div className="flex justify-end">
                  <MemberMenu member={c} spaceId={spaceId} onUpdated={load} />
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* Add user panel */}
      {showAddPanel && (
        <AddUserPanel
          spaceId={spaceId}
          roles={roles}
          onClose={() => setShowAddPanel(false)}
          onAdded={load}
        />
      )}
    </div>
  )
}
