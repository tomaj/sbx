'use client'

import { use, useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Tag } from 'lucide-react'
import { DataTable, type Column, type SortState } from '@/components/ui/data-table'
import { SearchBar } from '@/components/ui/search-bar'
import { RightSidebar } from '@/components/ui/right-sidebar'
import { InputWithCounter } from '@/components/ui/input-with-counter'
import { PageLayout } from '@/components/ui/page-layout'
import { useApi } from '@/lib/swr'
import { useCrudSidebar } from '@/hooks/use-crud-sidebar'
import { UnsavedChangesModal } from '@/components/ui/unsaved-changes-modal'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import type { TagWithCount } from '@sbx/types'

const tagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(60),
})
type TagFormValues = z.infer<typeof tagSchema>

interface ApiResponse {
  tags: TagWithCount[]
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
    render: (row) => (
      <span className="text-gray-600 dark:text-gray-400">{row.taggings_count}</span>
    ),
  },
]

export default function TagsPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params)

  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortState>({ field: 'name', direction: 'asc' })

  const qs = new URLSearchParams()
  if (search) qs.set('search', search)
  if (sort.field && sort.direction) qs.set('sort_by', `${sort.field}:${sort.direction}`)

  const { data, isLoading, mutate } = useApi<ApiResponse>(`/api/admin/spaces/${spaceId}/tags?${qs}`)
  const tags = data?.tags ?? []
  const total = tags.length

  const { open: sidebarOpen, mode: sidebarMode, selected: selectedTag, openCreate: openCreateRaw, openEdit: openEditRaw, close: closeSidebarRaw } = useCrudSidebar<TagWithCount>()

  const { handleSubmit, reset, control, formState: { errors, isSubmitting, isDirty }, setError } = useForm<TagFormValues>({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error — zod v4 minor version literal mismatch with @hookform/resolvers types
    resolver: zodResolver(tagSchema),
    defaultValues: { name: '' },
  })

  const { showModal: showUnsavedModal, handleConfirm: confirmUnsaved, handleCancel: cancelUnsaved } = useUnsavedChanges(isDirty)

  useEffect(() => {
    if (sidebarMode === 'edit' && selectedTag) {
      reset({ name: selectedTag.name })
    } else {
      reset({ name: '' })
    }
  }, [sidebarOpen, selectedTag, sidebarMode, reset])

  function openCreate() {
    openCreateRaw()
  }

  function openEdit(tag: TagWithCount) {
    openEditRaw(tag)
  }

  function closeSidebar() {
    closeSidebarRaw()
  }

  async function onSubmit(values: TagFormValues) {
    const url =
      sidebarMode === 'create'
        ? `/api/admin/spaces/${spaceId}/tags`
        : `/api/admin/spaces/${spaceId}/tags/${encodeURIComponent(selectedTag!.name)}`
    const res = await fetch(url, {
      method: sidebarMode === 'create' ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: values.name }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setError('root', { message: err?.message ?? 'Failed to save' })
      return
    }
    closeSidebar()
    mutate()
  }

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
      {/* Search */}
      <div className="mb-6">
        <SearchBar value={search} onChange={setSearch} placeholder="Search tags..." />
      </div>

      {/* Table */}
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

      {/* Total count */}
      {!isLoading && total > 0 && (
        <p className="mt-3 text-xs text-gray-400">{total} tag{total !== 1 ? 's' : ''} total</p>
      )}

      {/* Sidebar */}
      <RightSidebar
        open={sidebarOpen}
        onClose={closeSidebar}
        header={
          <div className="flex items-center gap-2">
            <Tag className="size-4 text-gray-400" />
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {sidebarMode === 'create' ? 'New Tag' : 'Edit Tag'}
            </span>
          </div>
        }
        footer={
          <div className="flex items-center gap-3 w-full justify-end">
            <button
              type="button"
              onClick={closeSidebar}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="tag-form"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {isSubmitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        }
      >
        <form id="tag-form" onSubmit={handleSubmit(onSubmit)}>
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
          {errors.name && (
            <p className="mt-2 text-sm text-red-500">{errors.name.message}</p>
          )}
          {errors.root && (
            <p className="mt-2 text-sm text-red-500">{errors.root.message}</p>
          )}
        </form>
      </RightSidebar>

      <UnsavedChangesModal
        open={showUnsavedModal}
        onConfirm={confirmUnsaved}
        onCancel={cancelUnsaved}
      />
    </PageLayout>
  )
}
