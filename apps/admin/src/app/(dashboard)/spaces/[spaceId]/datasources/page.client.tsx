'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/date';
import { Plus, Trash2 } from 'lucide-react';
import { SearchBar } from '@/components/ui/search-bar';
import { DataTable, type Column } from '@/components/ui/data-table';
import { PageLayout } from '@/components/ui/page-layout';
import { useDelete } from '@/hooks/use-delete';
import { useCrudList } from '@/hooks/use-crud-list';
import type { Datasource } from '@sbx/types';

interface ApiResponse {
  datasources: Datasource[];
  total: number;
  page: number;
  perPage: number;
}

interface NewDatasourceModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  spaceId: string;
}

function NewDatasourceModal({ open, onClose, onCreated, spaceId }: NewDatasourceModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!open) {
      setName('');
      setSlug('');
      setError(null);
      setSaving(false);
      setSlugTouched(false);
    }
  }, [open]);

  useEffect(() => {
    if (!slugTouched) {
      setSlug(
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      );
    }
  }, [name, slugTouched]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function handleCreate() {
    if (!name.trim() || !slug.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/datasources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        onCreated();
        onClose();
      } else {
        setError(data.message ?? 'Failed to create datasource');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            New Datasource
          </h2>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-md mb-4">
              {error}
            </p>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                ID/Slug <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                }}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !name.trim() || !slug.trim()}
            className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-md font-medium transition-colors"
          >
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DatasourcesPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params);
  const router = useRouter();

  const [showCreate, setShowCreate] = useState(false);

  const {
    data,
    isLoading,
    mutate,
    search,
    setSearch,
    sort,
    setSort,
    page,
    setPage,
    perPage,
    setPerPage,
  } = useCrudList<ApiResponse>({
    apiUrl: (qs) => `/api/admin/spaces/${spaceId}/datasources?${qs}`,
    defaultSort: { field: 'name', direction: 'asc' },
    storageKey: 'perPage:datasources',
  });

  const datasourceDelete = useDelete<Datasource>({
    getUrl: (ds) => `/api/admin/spaces/${spaceId}/datasources/${ds.id}`,
    onSuccess: () => mutate(),
    title: 'Delete Datasource',
    getMessage: (ds) =>
      `Are you sure you want to delete "${ds.name}"? All entries will be permanently removed.`,
  });

  const columns: Column<Datasource>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (ds) => (
        <button
          onClick={() => router.push(`/spaces/${spaceId}/datasources/${ds.id}`)}
          className="font-medium text-gray-900 dark:text-gray-100 hover:text-teal-600 dark:hover:text-teal-400 text-left"
        >
          {ds.name}
        </button>
      ),
    },
    {
      key: 'slug',
      label: 'Slug',
      width: '220px',
      render: (ds) => <span className="text-sm text-gray-400 font-mono">{ds.slug}</span>,
    },
    {
      key: 'created_at',
      label: 'Created',
      width: '160px',
      sortable: true,
      render: (ds) => <span className="text-sm text-gray-400">{formatDate(ds.created_at)}</span>,
    },
    {
      key: 'actions',
      label: '',
      width: '48px',
      render: (ds) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            datasourceDelete.confirm(ds);
          }}
          className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="Delete"
        >
          <Trash2 className="size-4" />
        </button>
      ),
    },
  ];

  return (
    <PageLayout
      title="Datasources"
      action={
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          <Plus className="size-4" />
          New Datasource
        </button>
      }
    >
      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search datasources..." />
      </div>

      <DataTable
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        data={(data?.datasources ?? []) as unknown as Record<string, unknown>[]}
        keyField="id"
        sort={sort}
        onSort={setSort}
        isLoading={isLoading}
        pagination={{
          total: data?.total ?? 0,
          page,
          perPage,
          onPageChange: setPage,
          onPerPageChange: setPerPage,
          storageKey: 'perPage:datasources',
        }}
      />

      <NewDatasourceModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => mutate()}
        spaceId={spaceId}
      />

      {datasourceDelete.modal}
    </PageLayout>
  );
}
