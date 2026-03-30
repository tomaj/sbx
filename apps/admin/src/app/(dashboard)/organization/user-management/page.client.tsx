'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { usePerPage } from '@/hooks/use-per-page'
import { MoreHorizontal, EyeOff, Plus } from 'lucide-react'
import { Tabs } from '@/components/ui/tabs'
import { SearchBar } from '@/components/ui/search-bar'
import { DataTable, type Column, type SortState } from '@/components/ui/data-table'
import { RightSidebar } from '@/components/ui/right-sidebar'
import { UserAvatar } from '@/components/ui/user-avatar'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { cn } from '@/lib/utils'

interface Space {
  id: number
  name: string
  role: string
}

interface User {
  id: number
  name: string
  firstname: string
  lastname: string
  email: string
  avatar: string | null
  role: 'admin' | 'member'
  spaces: Space[]
  disabled: boolean
  createdAt: string
  updatedAt: string
}

interface ApiResponse {
  users: User[]
  total: number
  page: number
  perPage: number
}

const FILTER_MAP: Record<string, string> = {
  org: 'all',
  internal: 'internal',
  disabled: 'disabled',
}

// ---- Spaces tooltip ----

function SpacesTooltip({ spaces }: { spaces: Space[] }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  function handleMouseEnter() {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, left: rect.left })
    setOpen(true)
  }

  if (spaces.length === 0) return <span className="text-sm text-gray-400">—</span>

  return (
    <>
      <button
        ref={btnRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setOpen(false)}
        className="text-sm text-teal-600 dark:text-teal-400 hover:underline whitespace-nowrap"
      >
        Active in {spaces.length} {spaces.length === 1 ? 'space' : 'spaces'}
      </button>
      {open && (
        <div
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[240px] py-2"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          {spaces.map((s) => (
            <div key={s.id} className="px-4 py-2.5">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">#{s.id} · {s.role}</p>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ---- Row menu ----

function RowMenu({ onEdit, onDisable, disabled }: { onEdit: () => void; onDisable: () => void; disabled: boolean }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  function handleOpen() {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setOpen((v) => !v)
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <div
          ref={menuRef}
          style={{ top: pos.top, right: pos.right }}
          className="fixed z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[150px]"
        >
          <button
            onClick={() => { onEdit(); setOpen(false) }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => { onDisable(); setOpen(false) }}
            className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {disabled ? 'Enable' : 'Disable'}
          </button>
        </div>
      )}
    </>
  )
}

// ---- Main page ----

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState('org')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'firstname', direction: 'asc' })
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = usePerPage('perPage:users', 10)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const [data, setData] = useState<ApiResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [editUser, setEditUser] = useState<User | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarMode, setSidebarMode] = useState<'edit' | 'create'>('edit')
  const [editRole, setEditRole] = useState<'admin' | 'member'>('member')
  const [editFirstname, setEditFirstname] = useState('')
  const [editLastname, setEditLastname] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
      filter: FILTER_MAP[activeTab] ?? 'all',
      sort_by: sort.field,
      sort_dir: sort.direction,
    })
    if (search.trim()) params.set('search', search.trim())

    const res = await fetch(`/api/admin/users?${params}`)
    if (res.ok) {
      const json = await res.json()
      setData(json)
    }
    setIsLoading(false)
  }, [page, perPage, activeTab, sort, search])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  // Counts per tab — fetched separately (no search filter)
  const [counts, setCounts] = useState({ org: 0, internal: 0, disabled: 0 })
  useEffect(() => {
    async function loadCounts() {
      const [all, internal, disabled] = await Promise.all([
        fetch('/api/admin/users?per_page=1&filter=all').then((r) => r.json()),
        fetch('/api/admin/users?per_page=1&filter=internal').then((r) => r.json()),
        fetch('/api/admin/users?per_page=1&filter=disabled').then((r) => r.json()),
      ])
      setCounts({
        org: all.total ?? 0,
        internal: internal.total ?? 0,
        disabled: disabled.total ?? 0,
      })
    }
    loadCounts()
  }, [])

  function openEdit(user: User) {
    setEditUser(user)
    setSidebarMode('edit')
    setEditRole(user.role)
    setEditFirstname(user.firstname)
    setEditLastname(user.lastname)
    setEditEmail(user.email)
    setSaveError(null)
    setSidebarOpen(true)
  }

  function openCreate() {
    setEditUser(null)
    setSidebarMode('create')
    setEditRole('member')
    setEditFirstname('')
    setEditLastname('')
    setEditEmail('')
    setSaveError(null)
    setSidebarOpen(true)
  }

  async function handleCreate() {
    if (!editEmail.trim()) return
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstname: editFirstname, lastname: editLastname, email: editEmail }),
      })
      const data = await res.json()
      if (res.ok) {
        setSidebarOpen(false)
        fetchUsers()
      } else {
        setSaveError(data.message ?? 'Failed to create user')
      }
    } catch {
      setSaveError('Network error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDisable(user: User) {
    await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disabled: !user.disabled }),
    })
    fetchUsers()
  }

  async function handleSave() {
    if (!editUser) return
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstname: editFirstname, lastname: editLastname }),
      })
      const data = await res.json()
      if (res.ok) {
        setSidebarOpen(false)
        fetchUsers()
      } else {
        setSaveError(data.message ?? 'Failed to update user')
      }
    } catch {
      setSaveError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const tabs = useMemo(() => [
    { id: 'org', label: 'Organization users', count: counts.org },
    { id: 'internal', label: 'Internal users', count: counts.internal },
    { id: 'disabled', label: 'Disabled users', count: counts.disabled },
  ], [counts])

  const columns: Column<User>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      skeletonRender: () => (
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-28 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="h-3 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </div>
        </div>
      ),
      render: (u) => (
        <div className="flex items-center gap-3">
          <UserAvatar name={u.name || `${u.firstname} ${u.lastname}`} src={u.avatar} size="md" />
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {u.firstname} {u.lastname}
            </p>
            <p className="text-xs text-gray-400">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      width: '120px',
      render: (u) =>
        u.role === 'admin' ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
            Admin
          </span>
        ) : (
          <span className="text-sm text-gray-600 dark:text-gray-400">Member</span>
        ),
    },
    {
      key: 'spaces',
      label: 'Spaces',
      width: '180px',
      render: (u) => <SpacesTooltip spaces={u.spaces} />,
    },
    {
      key: 'status',
      label: 'Status',
      width: '100px',
      render: (u) => (
        <span className={cn('text-sm', !u.disabled ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400')}>
          {u.disabled ? 'Disabled' : 'Active'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: '40px',
      render: (u) => <RowMenu onEdit={() => openEdit(u)} onDisable={() => handleDisable(u)} disabled={u.disabled} />,
    },
  ]

  return (
    <>
      <div className="flex flex-col min-h-full">
        <div className="px-8 pt-8 pb-0">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">User management</h1>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              <Plus className="size-4" />
              Add user
            </button>
          </div>
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={(id) => { setActiveTab(id); setPage(1); setSelectedIds([]) }}
          />
          <div className="py-4">
            <SearchBar
              value={search}
              onChange={(v) => { setSearch(v); setPage(1) }}
              placeholder="Search..."
              className="max-w-xs"
            />
          </div>
        </div>

        <DataTable
          columns={columns as unknown as Column<Record<string, unknown>>[]}
          data={(data?.users ?? []) as unknown as Record<string, unknown>[]}
          keyField="id"
          sort={sort}
          onSort={(field, direction) => { setSort({ field, direction }); setPage(1) }}
          selectedIds={selectedIds}
          onSelectChange={(ids) => setSelectedIds(ids as number[])}
          isLoading={isLoading}
          selectionActions={
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  await Promise.all(selectedIds.map((id) =>
                    fetch(`/api/admin/users/${id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ disabled: true }),
                    })
                  ))
                  setSelectedIds([])
                  fetchUsers()
                }}
                className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              >
                Disable selected
              </button>
              <button
                onClick={async () => {
                  if (!confirm(`Delete ${selectedIds.length} user(s)? This cannot be undone.`)) return
                  await Promise.all(selectedIds.map((id) =>
                    fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
                  ))
                  setSelectedIds([])
                  fetchUsers()
                }}
                className="px-3 py-1.5 text-xs border border-red-300 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
              >
                Remove selected
              </button>
            </div>
          }
          pagination={{
            total: data?.total ?? 0,
            page,
            perPage,
            onPageChange: setPage,
            onPerPageChange: (n) => { setPerPage(n); setPage(1) },
            storageKey: 'perPage:users',
          }}
        />
      </div>

      <RightSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        header={
          sidebarMode === 'create' ? (
            <span className="font-semibold text-gray-900 dark:text-gray-100">Add user</span>
          ) : editUser ? (
            <>
              <UserAvatar name={`${editUser.firstname} ${editUser.lastname}`} src={editUser.avatar} size="lg" />
              <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {editUser.firstname} {editUser.lastname}
              </span>
            </>
          ) : null
        }
        footer={
          <div className="flex items-center w-full">
            {sidebarMode === 'edit' && (
              <button className="text-gray-400 hover:text-red-500 transition-colors mr-auto">
                <EyeOff className="size-5" />
              </button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(false)}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={sidebarMode === 'create' ? handleCreate : handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-teal-200 hover:bg-teal-300 disabled:opacity-60 text-teal-800 rounded-md font-medium transition-colors"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        }
      >
        {saveError && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-md">{saveError}</p>
        )}

        {sidebarMode === 'create' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="user@telekom.sk"
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Role</label>
          <SelectDropdown
            value={editRole}
            onChange={(v) => v && setEditRole(v as 'admin' | 'member')}
            options={[
              { value: 'member', label: 'Member' },
              { value: 'admin', label: 'Admin' },
            ]}
          />
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 space-y-0.5">
            <p><strong>Member</strong> - Can be added to organization spaces</p>
            <p><strong>Admin</strong> - Can manage organization users and spaces</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">First name</label>
          <input
            type="text"
            value={editFirstname}
            onChange={(e) => setEditFirstname(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Last name</label>
          <input
            type="text"
            value={editLastname}
            onChange={(e) => setEditLastname(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </RightSidebar>
    </>
  )
}
