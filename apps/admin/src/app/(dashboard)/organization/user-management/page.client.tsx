'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usePerPage } from '@/hooks/use-per-page';
import { Plus } from 'lucide-react';
import { Tabs } from '@/components/ui/tabs';
import { SearchBar } from '@/components/ui/search-bar';
import { DataTable, type Column, type SortState } from '@/components/ui/data-table';
import { CrudSidebarForm } from '@/components/ui/crud-sidebar-form';
import { UserAvatar } from '@/components/ui/user-avatar';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useCrudSidebar } from '@/hooks/use-crud-sidebar';
import { PageLayout } from '@/components/ui/page-layout';
import { FormField, FormRootError, inputCls } from '@/components/ui/form-field';
import { useApi } from '@/lib/swr';
import { getUserColumns } from './user-columns';
import type { User } from '@sbx/types';

const createUserSchema = z.object({
  email: z.string().email('Valid email is required'),
});
type CreateUserFormValues = z.infer<typeof createUserSchema>;

const editUserSchema = z.object({
  firstname: z.string().optional(),
  lastname: z.string().optional(),
});
type EditUserFormValues = z.infer<typeof editUserSchema>;

interface ApiResponse {
  users: User[];
  total: number;
  page: number;
  perPage: number;
}

const FILTER_MAP: Record<string, string> = {
  org: 'all',
  internal: 'internal',
  disabled: 'disabled',
};

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState('org');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>({ field: 'firstname', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = usePerPage('perPage:users', 10);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    open: sidebarOpen,
    mode: sidebarMode,
    selected: selectedUser,
    openCreate: openCreateRaw,
    openEdit: openEditRaw,
    close: closeSidebar,
  } = useCrudSidebar<User>();

  // Build users URL
  const usersParams = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    filter: FILTER_MAP[activeTab] ?? 'all',
    sort_by: sort.field,
    sort_dir: sort.direction,
  });
  if (search.trim()) usersParams.set('search', search.trim());
  const { data, isLoading, mutate } = useApi<ApiResponse>(`/api/admin/users?${usersParams}`);

  // Counts per tab — fetched separately (no search filter)
  const { data: allData } = useApi<ApiResponse>('/api/admin/users?per_page=1&filter=all');
  const { data: internalData } = useApi<ApiResponse>('/api/admin/users?per_page=1&filter=internal');
  const { data: disabledData } = useApi<ApiResponse>('/api/admin/users?per_page=1&filter=disabled');

  const counts = useMemo(
    () => ({
      org: allData?.total ?? 0,
      internal: internalData?.total ?? 0,
      disabled: disabledData?.total ?? 0,
    }),
    [allData, internalData, disabledData],
  );

  // Create form
  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    formState: { errors: createErrors, isSubmitting: isCreating, isDirty: isCreateDirty },
    setError: setCreateError,
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: '' },
  });

  // Edit form
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isSaving, isDirty: isEditDirty },
    setError: setEditError,
  } = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { firstname: '', lastname: '' },
  });

  // Reset forms when sidebar opens
  useEffect(() => {
    if (sidebarMode === 'edit' && selectedUser) {
      resetEdit({ firstname: selectedUser.firstname, lastname: selectedUser.lastname });
    } else {
      resetCreate({ email: '' });
    }
  }, [selectedUser, sidebarMode, resetEdit, resetCreate]);

  function openEdit(user: User) {
    openEditRaw(user);
  }

  function openCreate() {
    openCreateRaw();
  }

  async function onCreateSubmit(values: CreateUserFormValues) {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: values.email }),
    });
    const json = await res.json();
    if (res.ok) {
      closeSidebar();
      mutate();
    } else {
      setCreateError('root', { message: json.message ?? 'Failed to create user' });
    }
  }

  async function handleDisable(user: User) {
    await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disabled: !user.disabled }),
    });
    mutate();
  }

  async function onEditSubmit(values: EditUserFormValues) {
    if (!selectedUser) return;
    const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstname: values.firstname, lastname: values.lastname }),
    });
    const json = await res.json();
    if (res.ok) {
      closeSidebar();
      mutate();
    } else {
      setEditError('root', { message: json.message ?? 'Failed to update user' });
    }
  }

  async function handleDeleteSelected() {
    await Promise.all(
      selectedIds.map((id) => fetch(`/api/admin/users/${id}`, { method: 'DELETE' })),
    );
    setSelectedIds([]);
    mutate();
  }

  const tabs = useMemo(
    () => [
      { id: 'org', label: 'Organization users', count: counts.org },
      { id: 'internal', label: 'Internal users', count: counts.internal },
      { id: 'disabled', label: 'Disabled users', count: counts.disabled },
    ],
    [counts],
  );

  const columns = getUserColumns({ openEdit, handleDisable });

  const isSubmitting = sidebarMode === 'create' ? isCreating : isSaving;

  return (
    <PageLayout
      title="User management"
      action={
        <button
          type="button"
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
        onChange={(id) => {
          setActiveTab(id);
          setPage(1);
          setSelectedIds([]);
        }}
      />
      <div className="py-4">
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search..."
          className="max-w-xs"
        />
      </div>

      <DataTable
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        data={(data?.users ?? []) as unknown as Record<string, unknown>[]}
        keyField="id"
        sort={sort}
        onSort={(field, direction) => {
          setSort({ field, direction });
          setPage(1);
        }}
        selectedIds={selectedIds}
        onSelectChange={(ids) => setSelectedIds(ids as number[])}
        isLoading={isLoading}
        selectionActions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                await Promise.all(
                  selectedIds.map((id) =>
                    fetch(`/api/admin/users/${id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ disabled: true }),
                    }),
                  ),
                );
                setSelectedIds([]);
                mutate();
              }}
              className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
            >
              Disable selected
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
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
          onPerPageChange: (n) => {
            setPerPage(n);
            setPage(1);
          },
          storageKey: 'perPage:users',
        }}
      />

      <ConfirmModal
        open={confirmDelete}
        title="Remove selected users"
        message={`Remove ${selectedIds.length} user(s)? This cannot be undone.`}
        confirmLabel="Remove"
        dangerous
        onConfirm={async () => {
          setConfirmDelete(false);
          await handleDeleteSelected();
        }}
        onCancel={() => setConfirmDelete(false)}
      />

      <CrudSidebarForm
        open={sidebarOpen}
        onClose={closeSidebar}
        title={
          sidebarMode === 'create'
            ? 'Add user'
            : selectedUser
              ? `${selectedUser.firstname} ${selectedUser.lastname}`
              : 'Edit user'
        }
        isSubmitting={isSubmitting}
        isDirty={isCreateDirty || isEditDirty}
        onSubmit={
          sidebarMode === 'create'
            ? handleSubmitCreate(onCreateSubmit)
            : handleSubmitEdit(onEditSubmit)
        }
        noForm
      >
        {sidebarMode === 'edit' && selectedUser && (
          <div className="flex items-center gap-3 mb-4">
            <UserAvatar
              name={`${selectedUser.firstname} ${selectedUser.lastname}`}
              src={selectedUser.avatar}
              size="lg"
            />
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {selectedUser.firstname} {selectedUser.lastname}
              </p>
              <p className="text-xs text-gray-400">{selectedUser.email}</p>
            </div>
          </div>
        )}

        {sidebarMode === 'create' ? (
          <div className="space-y-1">
            <FormField label="Email" required error={createErrors.email?.message}>
              <input
                type="email"
                {...registerCreate('email')}
                placeholder="user@telekom.sk"
                className={inputCls}
              />
            </FormField>
            <FormRootError message={createErrors.root?.message} />
          </div>
        ) : (
          <div className="space-y-1">
            <FormField label="First name">
              <input type="text" {...registerEdit('firstname')} className={inputCls} />
            </FormField>
            <FormField label="Last name">
              <input type="text" {...registerEdit('lastname')} className={inputCls} />
            </FormField>
            <FormRootError message={editErrors.root?.message} />
          </div>
        )}
      </CrudSidebarForm>
    </PageLayout>
  );
}
