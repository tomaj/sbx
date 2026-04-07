'use client';

import { use, useState, useEffect, useCallback, useRef } from 'react';
import { usePerPage } from '@/hooks/use-per-page';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { SearchBar } from '@/components/ui/search-bar';
import { CrudSidebarForm } from '@/components/ui/crud-sidebar-form';
import { SortableList, SortableItem, SortableDragHandle } from '@/components/ui/sortable-list';
import { useDelete } from '@/hooks/use-delete';
import { useApi } from '@/lib/swr';
import { Pagination } from '@/components/ui/pagination';
import { SkeletonBlock } from '@/components/ui/skeleton';
import { FormField, inputCls } from '@/components/ui/form-field';
import type { DatasourceEntry, DatasourceWithDimensions } from '@sbx/types';

// ---- Entry row ----

interface EntryRowProps {
  entry: DatasourceEntry;
  onSave: (id: number, name: string, value: string) => Promise<void>;
  onDelete: (entry: DatasourceEntry) => void;
}

function EntryRow({ entry, onSave, onDelete }: EntryRowProps) {
  const [name, setName] = useState(entry.name);
  const [value, setValue] = useState(entry.value);
  const [saving, setSaving] = useState(false);
  const isDirty = name !== entry.name || value !== entry.value;

  // Sync from props only when the entry identity changes (not on every re-render from parent)
  const prevIdRef = useRef(entry.id);
  useEffect(() => {
    if (prevIdRef.current !== entry.id) {
      setName(entry.name);
      setValue(entry.value);
      prevIdRef.current = entry.id;
    }
  }, [entry.id, entry.name, entry.value]);

  async function handleSave() {
    setSaving(true);
    await onSave(entry.id, name, value);
    setSaving(false);
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <SortableDragHandle />

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        className="flex-1 min-w-0 px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
      />

      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Value"
        className="flex-[2] min-w-0 px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
      />

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !isDirty}
        className="shrink-0 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 text-gray-700 dark:text-gray-300 transition-colors"
      >
        {saving ? '...' : 'Save'}
      </button>

      <button
        type="button"
        onClick={() => onDelete(entry)}
        className="shrink-0 p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

// ---- Main page ----

export default function DatasourceDetailPage({
  params,
}: {
  params: Promise<{ spaceId: string; datasourceId: string }>;
}) {
  const { spaceId, datasourceId } = use(params);

  const { data: dsData, mutate: mutateDatasource } = useApi<{
    datasource: DatasourceWithDimensions;
  }>(`/api/admin/spaces/${spaceId}/datasources/${datasourceId}`);
  const datasource = dsData?.datasource ?? null;

  const [entries, setEntries] = useState<DatasourceEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = usePerPage('perPage:datasource-entries', 25);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [adding, setAdding] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editIsDirty, setEditIsDirty] = useState(false);

  // Fetch entries via MAPI /datasource_entries?datasource_id=...
  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    const p = new URLSearchParams({
      datasource_id: datasourceId,
      page: String(page),
      per_page: String(perPage),
    });
    if (search.trim()) p.set('search', search.trim());
    const res = await fetch(`/api/admin/spaces/${spaceId}/datasource_entries?${p}`);
    if (res.ok) {
      const data = await res.json();
      setEntries(data.datasource_entries ?? []);
      setTotal(data.total ?? 0);
    }
    setIsLoading(false);
  }, [spaceId, datasourceId, page, perPage, search]);

  const entryDelete = useDelete<DatasourceEntry>({
    getUrl: (e) => `/api/admin/spaces/${spaceId}/datasource_entries/${e.id}`,
    onSuccess: fetchEntries,
    title: 'Delete Entry',
    getMessage: (e) => `Delete entry "${e.name}"?`,
  });

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  async function handleAdd() {
    if (!newName.trim() || !newValue.trim()) return;
    setAdding(true);
    const res = await fetch(`/api/admin/spaces/${spaceId}/datasource_entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        datasource_entry: {
          name: newName.trim(),
          value: newValue.trim(),
          datasource_id: parseInt(datasourceId, 10),
        },
      }),
    });
    if (res.ok) {
      setNewName('');
      setNewValue('');
      fetchEntries();
    }
    setAdding(false);
  }

  async function handleSaveEntry(id: number, name: string, value: string) {
    const res = await fetch(`/api/admin/spaces/${spaceId}/datasource_entries/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        datasource_entry: { name, value, datasource_id: parseInt(datasourceId, 10) },
      }),
    });
    if (res.ok) {
      // Update just this entry in local state — don't refetch to preserve other dirty rows
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, name, value } : e)));
    }
  }

  function openEdit() {
    if (!datasource) return;
    setEditName(datasource.name);
    setEditSlug(datasource.slug);
    setEditError(null);
    setEditIsDirty(false);
    setSidebarOpen(true);
  }

  async function handleEditSave() {
    if (!datasource) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/datasources/${datasource.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasource: { name: editName.trim(), slug: editSlug.trim() } }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditIsDirty(false);
        setSidebarOpen(false);
        mutateDatasource();
      } else {
        setEditError(data.message ?? 'Failed to update datasource');
      }
    } catch {
      setEditError('Network error');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleReorder(reordered: DatasourceEntry[]) {
    const original = entries;
    setEntries(reordered);

    // Persist positions via MAPI — update only entries whose position changed
    const idsToUpdate: { id: number; position: number }[] = [];
    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].id !== original[i]?.id) {
        idsToUpdate.push({ id: reordered[i].id, position: i });
      }
    }

    await Promise.all(
      idsToUpdate.map(({ id, position }) =>
        fetch(`/api/admin/spaces/${spaceId}/datasource_entries/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            datasource_entry: { position, datasource_id: parseInt(datasourceId, 10) },
          }),
        }),
      ),
    );
  }

  return (
    <>
      <div className="flex flex-col min-h-full">
        <div className="px-8 pt-6 pb-0">
          <Link
            href={`/spaces/${spaceId}/datasources`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Datasources
          </Link>

          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {datasource?.name ?? '...'}
            </h1>
            <button
              type="button"
              onClick={openEdit}
              className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Edit
            </button>
          </div>

          {/* Add entry form */}
          <div className="flex items-center gap-2 mb-4 p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800/40">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name"
              className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
              }}
            />
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Value"
              className="flex-[2] px-3 py-2 border border-gray-200 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
              }}
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding || !newName.trim() || !newValue.trim()}
              className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded font-medium transition-colors shrink-0"
            >
              {adding ? '...' : 'Add'}
            </button>
          </div>

          <div className="mb-2">
            <SearchBar
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search by name or value..."
            />
          </div>
        </div>

        {/* Entries list */}
        <div className="flex-1">
          {isLoading ? (
            ['sk0', 'sk1', 'sk2', 'sk3', 'sk4', 'sk5', 'sk6', 'sk7'].map((id) => (
              <div
                key={id}
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800"
              >
                <SkeletonBlock className="size-4" />
                <SkeletonBlock className="h-8 flex-1" />
                <SkeletonBlock className="h-8 flex-[2]" />
                <SkeletonBlock className="h-8 w-14" />
                <SkeletonBlock className="size-7" />
              </div>
            ))
          ) : entries.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No entries found</div>
          ) : (
            <SortableList
              items={entries}
              getKey={(e) => e.id}
              onReorder={handleReorder}
              renderItem={(entry) => (
                <SortableItem
                  key={entry.id}
                  id={entry.id}
                  draggingClassName="opacity-40 bg-teal-50 dark:bg-teal-900/10 shadow-lg"
                >
                  <EntryRow entry={entry} onSave={handleSaveEntry} onDelete={entryDelete.confirm} />
                </SortableItem>
              )}
            />
          )}
        </div>

        <Pagination
          total={total}
          page={page}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={(n) => {
            setPerPage(n);
            setPage(1);
          }}
          storageKey="perPage:datasource-entries"
        />
      </div>

      {/* Edit sidebar */}
      <CrudSidebarForm
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        title={datasource?.name ?? 'Edit Datasource'}
        isSubmitting={editSaving}
        isDirty={editIsDirty}
        onSubmit={handleEditSave}
        noForm
      >
        {editError && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-md">
            {editError}
          </p>
        )}
        <FormField label="Name" required>
          <input
            type="text"
            value={editName}
            onChange={(e) => {
              setEditName(e.target.value);
              setEditIsDirty(true);
            }}
            className={inputCls}
          />
        </FormField>
        <FormField label="ID/Slug" required>
          <input
            type="text"
            value={editSlug}
            onChange={(e) => {
              setEditSlug(e.target.value);
              setEditIsDirty(true);
            }}
            className={inputCls}
          />
        </FormField>
      </CrudSidebarForm>

      {entryDelete.modal}
    </>
  );
}
