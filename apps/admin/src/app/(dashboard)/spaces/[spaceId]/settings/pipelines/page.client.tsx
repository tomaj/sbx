'use client';

import { useState, use } from 'react';
import { Settings, Trash2, GripVertical } from 'lucide-react';
import { z } from 'zod';
import { CrudSidebarForm } from '@/components/ui/crud-sidebar-form';
import { EmptyState } from '@/components/ui/empty-state';
import { useDelete } from '@/hooks/use-delete';
import { useCrudSidebar } from '@/hooks/use-crud-sidebar';
import { useApi } from '@/lib/swr';
import { useCrudForm } from '@/hooks/use-crud-form';
import type { Branch } from '@sbx/types';
import { SkeletonText, SkeletonBlock } from '@/components/ui/skeleton';
import { FormField, inputCls } from '@/components/ui/form-field';

// ─── Edit form (inside RightSidebar) ─────────────────────────────────────────

const branchFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().optional(),
});
type BranchFormValues = z.infer<typeof branchFormSchema>;

interface BranchFormProps {
  spaceId: string;
  branch: Branch | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function BranchForm({ spaceId, branch, open, onClose, onSaved }: BranchFormProps) {
  const { form, onSubmit } = useCrudForm<Branch, BranchFormValues>({
    schema: branchFormSchema,
    defaultValues: { name: '', url: '' },
    mode: branch ? 'edit' : 'create',
    item: branch,
    open,
    getInitialValues: (b) => ({ name: b.name, url: b.url ?? '' }),
    buildRequest: (values, mode, item) =>
      fetch(
        mode === 'create'
          ? `/api/admin/spaces/${spaceId}/branches`
          : `/api/admin/spaces/${spaceId}/branches/${item!.id}`,
        {
          method: mode === 'create' ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: values.name, url: values.url?.trim() || null }),
        },
      ),
    onSuccess: onSaved,
  });

  async function handleDelete() {
    if (!branch) return;
    await fetch(`/api/admin/spaces/${spaceId}/branches/${branch.id}`, { method: 'DELETE' });
    onSaved();
  }

  return (
    <CrudSidebarForm
      open={open}
      onClose={onClose}
      title={branch ? 'Edit Pipeline' : 'New Pipeline'}
      isSubmitting={form.formState.isSubmitting}
      isDirty={form.formState.isDirty}
      onSubmit={onSubmit}
      onDelete={branch ? handleDelete : undefined}
      deleteTitle="Delete Pipeline"
      deleteMessage={`Are you sure you want to delete "${branch?.name ?? ''}"?`}
    >
      {form.formState.errors.root?.message && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {form.formState.errors.root.message}
        </p>
      )}

      <FormField label="Name" required error={form.formState.errors.name?.message}>
        <input
          type="text"
          placeholder="Production"
          className={inputCls}
          disabled={form.formState.isSubmitting}
          {...form.register('name')}
        />
      </FormField>

      <FormField label="Preview URL">
        <input
          type="url"
          placeholder="https://example.com/"
          className={inputCls}
          disabled={form.formState.isSubmitting}
          {...form.register('url')}
        />
      </FormField>
    </CrudSidebarForm>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PipelinesPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params);
  const { data, isLoading, mutate } = useApi<{ branches: Branch[] }>(
    `/api/admin/spaces/${spaceId}/branches`,
  );
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const { open: panelOpen, selected: selectedBranch, openEdit, close } = useCrudSidebar<Branch>();

  const branchDelete = useDelete<Branch>({
    getUrl: (b) => `/api/admin/spaces/${spaceId}/branches/${b.id}`,
    onSuccess: () => mutate(),
    title: 'Delete Pipeline',
    getMessage: (b) => `Are you sure you want to delete "${b.name}"?`,
  });

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    await fetch(`/api/admin/spaces/${spaceId}/branches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setNewName('');
    setAdding(false);
    mutate();
  }

  function truncate(url: string, max = 30) {
    return url.length > max ? `${url.slice(0, max)}...` : url;
  }

  return (
    <div className="max-w-3xl px-10 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Pipelines</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
        With pipelines, stages define a strict content staging workflow in your space. This is
        crucial if you want to create a reliable production environment. You can define multiple
        stages, each with its own API access token for your content, to preview and test before it
        goes live.
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

      {isLoading ? (
        <div>
          <SkeletonText width="w-40" height="h-5" className="mb-3" />
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className={`flex items-center gap-4 px-4 py-3 bg-white dark:bg-gray-900 ${i > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}`}
              >
                <SkeletonBlock height="h-4" width="w-4" />
                <SkeletonText width="w-28" />
                <SkeletonText width="w-48" className="flex-1" />
                <div className="flex gap-1">
                  <SkeletonBlock height="h-7" width="w-7" />
                  <SkeletonBlock height="h-7" width="w-7" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (data?.branches ?? []).length === 0 ? (
        <EmptyState message="No pipelines configured yet." />
      ) : (
        <>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Added pipelines ({(data?.branches ?? []).length})
          </p>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[40px_1fr_1fr_72px] items-center px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <span />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Name</span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Preview URL
              </span>
              <span />
            </div>

            {(data?.branches ?? []).map((b, i) => (
              <div
                key={b.id}
                className={`grid grid-cols-[40px_1fr_1fr_72px] items-center px-4 py-3 bg-white dark:bg-gray-900 ${
                  i > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''
                }`}
              >
                <span className="text-gray-400 dark:text-gray-600 cursor-grab">
                  <GripVertical className="w-4 h-4" />
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {b.name}
                </span>
                <span
                  className="text-sm text-gray-500 dark:text-gray-400 truncate"
                  title={b.url ?? ''}
                >
                  {b.url ? (
                    truncate(b.url)
                  ) : (
                    <span className="text-gray-300 dark:text-gray-600">—</span>
                  )}
                </span>
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => openEdit(b)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => branchDelete.confirm(b)}
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
        onClose={close}
        onSaved={() => {
          close();
          mutate();
        }}
      />

      {branchDelete.modal}
    </div>
  );
}
