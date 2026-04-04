'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { usePerPage } from '@/hooks/use-per-page'
import { MoreHorizontal, EyeOff, Plus } from 'lucide-react'
import { Tabs } from '@/components/ui/tabs'
import { SearchBar } from '@/components/ui/search-bar'
import { DataTable, type Column, type SortState } from '@/components/ui/data-table'
import { RightSidebar } from '@/components/ui/right-sidebar'
import { UnsavedChangesModal } from '@/components/ui/unsaved-changes-modal'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { UserAvatar } from '@/components/ui/user-avatar'
import { cn } from '@/lib/utils'
import { useCrudSidebar } from '@/hooks/use-crud-sidebar'
import { PageLayout } from '@/components/ui/page-layout'
import type { User, UserSpace } from '@sbx/types'

const createUserSchema = z.object({
  email: z.string().email('Valid email is required'),
})
type CreateUserFormValues = z.infer<typeof createUserSchema>

const editUserSchema = z.object({
  firstname: z.string().optional(),
  lastname: z.string().optional(),
})
type EditUserFormValues = z.infer<typeof editUserSchema>

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

function SpacesTooltip({ spaces }: { spaces: UserSpace[] }) {
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
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[150px]">
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
    </div>
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

  const { open: sidebarOpen, mode: sidebarMode, selected: selectedUser, openCreate: openCreateRaw, openEdit: openEditRaw, close: closeSidebar } = useCrudSidebar<User>()

  // Create form
  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    formState: { errors: createErrors, isSubmitting: isCreating, isDirty: isCreateDirty },
    setError: setCreateError,
  } = useForm<CreateUserFormValues>({
    // @ts-expect-error — zod v4 minor version literal mismatch with @hookform/resolvers types
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: '' },
  })

  // Edit form
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isSaving, isDirty: isEditDirty },
    setError: setEditError,
  } = useForm<EditUserFormValues>({
    // @ts-expect-error — zod v4 minor version literal mismatch with @hookform/resolvers types
    resolver: zodResolver(editUserSchema),
    defaultValues: { firstname: '', lastname: '' },
  })

  const { showModal: showUnsavedModal, handleConfirm: confirmUnsaved, handleCancel: cancelUnsaved } = useUnsavedChanges(sidebarOpen && (isCreateDirty || isEditDirty))

  // Reset forms when sidebar opens
  useEffect(() => {
    if (sidebarMode === 'edit' && selectedUser) {
      resetEdit({ firstname: selectedUser.firstname, lastname: selectedUser.lastname })
    } else {
      resetCreate({ email: '' })
    }
  }, [sidebarOpen, selectedUser, sidebarMode, resetEdit, resetCreate])

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
    openEditRaw(user)
  }

  function openCreate() {
    openCreateRaw()
  }

  async function onCreateSubmit(values: CreateUserFormValues) {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: values.email }),
    })
    const json = await res.json()
    if (res.ok) {
      closeSidebar()
      fetchUsers()
    } else {
      setCreateError('root', { message: json.message ?? 'Failed to create user' })
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

  async function onEditSubmit(values: EditUserFormValues) {
    if (!selectedUser) return
    const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstname: values.firstname, lastname: values.lastname }),
    })
    const json = await res.json()
    if (res.ok) {
      closeSidebar()
      fetchUsers()
    } else {
      setEditError('root', { message: json.message ?? 'Failed to update user' })
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

  const isSubmitting = sidebarMode === 'create' ? isCreating : isSaving

  return (
    <PageLayout
      title="User management"
      action={
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          <Plus className="size-4" />
          Add user
        </button>
      }
    >
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

      <RightSidebar
        open={sidebarOpen}
        onClose={closeSidebar}
        header={
          sidebarMode === 'create' ? (
            <span className="font-semibold text-gray-900 dark:text-gray-100">Add user</span>
          ) : selectedUser ? (
            <>
              <UserAvatar name={`${selectedUser.firstname} ${selectedUser.lastname}`} src={selectedUser.avatar} size="lg" />
              <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {selectedUser.firstname} {selectedUser.lastname}
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
                type="button"
                onClick={closeSidebar}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form={sidebarMode === 'create' ? 'create-user-form' : 'edit-user-form'}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm bg-teal-200 hover:bg-teal-300 disabled:opacity-60 text-teal-800 rounded-md font-medium transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        }
      >
        {sidebarMode === 'create' ? (
          <form id="create-user-form" onSubmit={handleSubmitCreate(onCreateSubmit)}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  {...registerCreate('email')}
                  placeholder="user@telekom.sk"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {createErrors.email && (
                  <p className="mt-1 text-xs text-red-500">{createErrors.email.message}</p>
                )}
              </div>
              {createErrors.root && (
                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-md">
                  {createErrors.root.message}
                </p>
              )}
            </div>
          </form>
        ) : (
          <form id="edit-user-form" onSubmit={handleSubmitEdit(onEditSubmit)}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">First name</label>
                <input
                  type="text"
                  {...registerEdit('firstname')}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Last name</label>
                <input
                  type="text"
                  {...registerEdit('lastname')}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              {editErrors.root && (
                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-md">
                  {editErrors.root.message}
                </p>
              )}
            </div>
          </form>
        )}
      </RightSidebar>

      <UnsavedChangesModal open={showUnsavedModal} onConfirm={confirmUnsaved} onCancel={cancelUnsaved} />
    </PageLayout>
  )
}
