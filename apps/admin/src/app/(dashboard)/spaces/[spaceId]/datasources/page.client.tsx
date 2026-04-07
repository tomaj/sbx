'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/date';
import { Plus, Trash2 } from 'lucide-react';
import { SearchBar } from '@/components/ui/search-bar';
import { DataTable, type Column } from '@/components/ui/data-table';
import { PageLayout } from '@/components/ui/page-layout';
import { useDelete } from '@/hooks/use-delete';
import { useCrudList } from '@/hooks/use-crud-list';
import { NewDatasourceModal } from './new-datasource-modal';
import type { Datasource } from '@sbx/types';

interface ApiResponse {
  datasources: Datasource[];
  total: number;
  page: number;
  perPage: number;
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
          type="button"
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
          type="button"
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
          type="button"
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
