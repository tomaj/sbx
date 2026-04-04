'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Search, Plus, Code2 } from 'lucide-react';
import { PageLayout } from '@/components/ui/page-layout';
import { SkeletonText } from '@/components/ui/skeleton';
import { useApi } from '@/lib/swr';
import type { FieldType } from '@sbx/types';

const fieldTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});
type FieldTypeFormValues = z.infer<typeof fieldTypeSchema>;

export default function OrgFieldTypesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  const {
    data,
    isLoading: loading,
    mutate,
  } = useApi<{ field_types: FieldType[] }>('/api/admin/field-types');
  const fieldTypes = data?.field_types ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return fieldTypes;
    return fieldTypes.filter((ft) => ft.name.toLowerCase().includes(search.toLowerCase()));
  }, [fieldTypes, search]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FieldTypeFormValues>({
    resolver: zodResolver(fieldTypeSchema),
    defaultValues: { name: '' },
  });

  async function onCreateSubmit(values: FieldTypeFormValues) {
    const res = await fetch('/api/admin/field-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_type: { name: values.name.trim() } }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError('root', { message: data.message ?? 'Error' });
      return;
    }
    router.push(`/organization/field-types/${data.field_type.id}`);
  }

  return (
    <PageLayout
      title="Field-types"
      action={
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Field-type
        </button>
      }
    >
      {/* Create form */}
      {creating && (
        <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            New field-type name
          </p>
          <form onSubmit={handleSubmit(onCreateSubmit)} className="flex gap-2">
            <input
              type="text"
              {...register('name')}
              placeholder="e.g. my-custom-picker"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                reset();
              }}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
          </form>
          {errors.name && <p className="text-xs text-red-500 mt-2">{errors.name.message}</p>}
          {errors.root && <p className="text-xs text-red-500 mt-2">{errors.root.message}</p>}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search field-types ..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-px border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-4 py-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <div>
                <SkeletonText className="w-36 mb-1.5" />
                <SkeletonText className="w-16 h-3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Code2 className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">
            {search ? 'No field-types match your search' : 'No field-types yet'}
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {filtered.map((ft) => (
            <div
              key={ft.id}
              className="flex items-center justify-between px-4 py-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
            >
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {ft.name}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">#{ft.id}</div>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/organization/field-types/${ft.id}`)}
                className="text-sm font-medium text-teal-600 dark:text-teal-400 hover:underline"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
