'use client';

import { use } from 'react';
import { Controller } from 'react-hook-form';
import { z } from 'zod';
import { Plus, Tag } from 'lucide-react';
import { DataTable, type Column, type SortState } from '@/components/ui/data-table';
import { SearchBar } from '@/components/ui/search-bar';
import { InputWithCounter } from '@/components/ui/input-with-counter';
import { PageLayout } from '@/components/ui/page-layout';
import { CrudSidebarForm } from '@/components/ui/crud-sidebar-form';
import { useApi } from '@/lib/swr';
import { useCrudSidebar } from '@/hooks/use-crud-sidebar';
import { useCrudForm } from '@/hooks/use-crud-form';
import { useState } from 'react';
import type { TagWithCount } from '@sbx/types';

const tagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(60),
});
type TagFormValues = z.infer<typeof tagSchema>;

interface ApiResponse {
  tags: TagWithCount[];
}

const COLUMNS: Column<TagWithCount>[] = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    render: (row) => (
      <span className="font-medium text-gray-900 dark:text-gray-100">{row.name}</span>
    ),
  },
  {
    key: 'taggings_count',
    label: 'Assigned items',
    sortable: true,
    render: (row) => <span className="text-gray-600 dark:text-gray-400">{row.taggings_count}</span>,
  },
];

export default function TagsPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>({ field: 'name', direction: 'asc' });

  const qs = new URLSearchParams();
  if (search) qs.set('search', search);
  if (sort.field && sort.direction) qs.set('sort_by', `${sort.field}:${sort.direction}`);

  const { data, isLoading, mutate } = useApi<ApiResponse>(
    `/api/admin/spaces/${spaceId}/tags?${qs}`,
  );
  const tags = data?.tags ?? [];
  const total = tags.length;

  const {
    open: sidebarOpen,
    mode: sidebarMode,
    selected: selectedTag,
    openCreate,
    openEdit,
    close: closeSidebar,
  } = useCrudSidebar<TagWithCount>();

  const { form, onSubmit } = useCrudForm<TagWithCount, TagFormValues>({
    schema: tagSchema,
    defaultValues: { name: '' },
    mode: sidebarMode,
    item: selectedTag,
    open: sidebarOpen,
    getInitialValues: (tag) => ({ name: tag.name }),
    onSuccess: () => {
      closeSidebar();
      mutate();
    },
    buildRequest: (values, mode, item) => {
      const url =
        mode === 'create'
          ? `/api/admin/spaces/${spaceId}/tags`
          : `/api/admin/spaces/${spaceId}/tags/${encodeURIComponent(item!.name)}`;
      return fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: values.name }),
      });
    },
  });
  const {
    control,
    formState: { errors, isSubmitting, isDirty },
  } = form;

  return (
    <PageLayout
      title="Tags"
      description='New tags can be created in the "Entry Configuration" section of a content item or by clicking the "New Tag" button.'
      action={
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
        >
          <Plus className="size-4" />
          New Tag
        </button>
      }
    >
      <div className="mb-6">
        <SearchBar value={search} onChange={setSearch} placeholder="Search tags..." />
      </div>

      <DataTable
        columns={COLUMNS}
        data={tags}
        keyField="name"
        sort={sort}
        onSort={(field, direction) => setSort({ field, direction })}
        isLoading={isLoading}
        emptyMessage="No tags found"
        onRowClick={openEdit}
      />

      {!isLoading && total > 0 && (
        <p className="mt-3 text-xs text-gray-400">
          {total} tag{total !== 1 ? 's' : ''} total
        </p>
      )}

      <CrudSidebarForm
        open={sidebarOpen}
        onClose={closeSidebar}
        title={sidebarMode === 'create' ? 'New Tag' : 'Edit Tag'}
        isSubmitting={isSubmitting}
        isDirty={isDirty}
        onSubmit={onSubmit}
      >
        <div className="flex items-center gap-2 mb-4">
          <Tag className="size-4 text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {sidebarMode === 'create' ? 'Create a new tag' : 'Edit tag details'}
          </span>
        </div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Name <span className="text-red-500">*</span>
        </label>
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <InputWithCounter
              value={field.value}
              onChange={field.onChange}
              maxLength={60}
              placeholder="Tag name"
              autoFocus
            />
          )}
        />
        {errors.name && <p className="mt-2 text-sm text-red-500">{errors.name.message}</p>}
        {errors.root && <p className="mt-2 text-sm text-red-500">{errors.root.message}</p>}
      </CrudSidebarForm>
    </PageLayout>
  );
}
