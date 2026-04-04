'use client';

import { useState, useEffect, use } from 'react';
import { z } from 'zod';
import { Play, Settings2, Trash2, Plus, Loader2 } from 'lucide-react';
import { formatDateTime } from '@/lib/date';
import { DataTable, type Column, type SortState } from '@/components/ui/data-table';
import { SearchBar } from '@/components/ui/search-bar';
import { CrudSidebarForm } from '@/components/ui/crud-sidebar-form';
import { PageLayout } from '@/components/ui/page-layout';
import { useApi } from '@/lib/swr';
import { useCrudSidebar } from '@/hooks/use-crud-sidebar';
import { useDelete } from '@/hooks/use-delete';
import { useCrudForm } from '@/hooks/use-crud-form';
import type { Task } from '@sbx/types';

const taskSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  webhook_url: z.string().optional(),
  user_dialog: z.string().superRefine((val, ctx) => {
    try {
      JSON.parse(val);
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid JSON' });
    }
  }),
});
type TaskFormValues = z.infer<typeof taskSchema>;

// ─── Execute dialog ───────────────────────────────────────────────────────────

interface ExecuteDialogProps {
  open: boolean;
  task: Task | null;
  spaceId: string;
  onClose: () => void;
  onExecuted: () => void;
}

function ExecuteDialog({ open, task, spaceId, onClose, onExecuted }: ExecuteDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fields = task ? (Object.entries(task.user_dialog ?? {}) as [string, any][]) : [];

  useEffect(() => {
    if (!open || !task) return;
    const initial: Record<string, string> = {};
    for (const [key, def] of fields) {
      if (def.type === 'option' && def.options?.length) {
        initial[key] = def.options[0].value;
      } else {
        initial[key] = '';
      }
    }
    setValues(initial);
    setError(null);
    setRunning(false);
  }, [open, task, fields]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function handleExecute() {
    if (!task) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/tasks/${task.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dialog_values: values }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Execution failed');
      onExecuted();
    } catch (e: any) {
      setError(e.message ?? 'Execution failed');
      setRunning(false);
    }
  }

  if (!open || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            Execute: {task.name}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <Plus className="w-4 h-4 rotate-45" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {fields.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This task has no user input fields. Click Execute to run it immediately.
            </p>
          )}
          {fields.map(([key, def]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {def.display_name || key}
                {def.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {def.type === 'option' ? (
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {(def.options ?? []).map((opt: any) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`dialog_${key}`}
                        value={opt.value}
                        checked={values[key] === opt.value}
                        onChange={() => setValues((prev) => ({ ...prev, [key]: opt.value }))}
                        className="w-4 h-4 accent-teal-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{opt.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  value={values[key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                  placeholder={def.placeholder ?? ''}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              )}
            </div>
          ))}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleExecute}
            disabled={running}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50"
          >
            {running && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {running ? 'Running…' : 'Execute'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TasksPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>({ field: 'name', direction: 'asc' });

  const { data, isLoading, mutate } = useApi<{ tasks: Task[] }>(
    `/api/admin/spaces/${spaceId}/tasks`,
    {
      refreshInterval: (latestData: { tasks: Task[] } | undefined) =>
        latestData?.tasks?.some((t) => t.running) ? 1500 : 0,
    },
  );

  const allTasks = data?.tasks ?? [];

  let tasks = allTasks;
  if (search) {
    const q = search.toLowerCase();
    tasks = tasks.filter(
      (t) => t.name.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q),
    );
  }
  tasks = [...tasks].sort((a, b) => {
    const av = String(a[sort.field] ?? '');
    const bv = String(b[sort.field] ?? '');
    return sort.direction === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });
  const total = tasks.length;

  const {
    open: sidebarOpen,
    mode: sidebarMode,
    selected: selectedTask,
    openCreate,
    openEdit,
    close: closeSidebar,
  } = useCrudSidebar<Task>();

  // ─── Delete ─────────────────────────────────────────────────────────────
  const taskDelete = useDelete<Task>({
    getUrl: (t) => `/api/admin/spaces/${spaceId}/tasks/${t.id}`,
    onSuccess: () => mutate(),
    title: 'Delete task',
    getMessage: (t) => `Are you sure you want to delete "${t.name}"? This action cannot be undone.`,
  });

  // ─── Form ────────────────────────────────────────────────────────────────
  const { form, onSubmit } = useCrudForm<Task, TaskFormValues>({
    schema: taskSchema,
    defaultValues: { name: '', description: '', webhook_url: '', user_dialog: '{}' },
    mode: sidebarMode,
    item: selectedTask,
    open: sidebarOpen,
    getInitialValues: (t) => ({
      name: t.name,
      description: t.description ?? '',
      webhook_url: t.webhook_url ?? '',
      user_dialog: JSON.stringify(t.user_dialog ?? {}, null, 2),
    }),
    onSuccess: () => {
      closeSidebar();
      mutate();
    },
    buildRequest: (values, mode, item) => {
      const url =
        mode === 'create'
          ? `/api/admin/spaces/${spaceId}/tasks`
          : `/api/admin/spaces/${spaceId}/tasks/${item!.id}`;
      return fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name.trim(),
          description: values.description?.trim() || null,
          task_type: 'webhook',
          webhook_url: values.webhook_url?.trim() || null,
          user_dialog: JSON.parse(values.user_dialog),
        }),
      });
    },
  });
  const {
    register,
    formState: { errors, isSubmitting },
  } = form;

  // ─── Execute ─────────────────────────────────────────────────────────────
  const [executeOpen, setExecuteOpen] = useState(false);
  const [executingTask, setExecutingTask] = useState<Task | null>(null);

  function handleExecuted() {
    setExecuteOpen(false);
    mutate();
  }

  // ─── Columns ─────────────────────────────────────────────────────────────

  const COLUMNS: Column<Task>[] = [
    {
      key: 'name',
      label: 'Task name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <svg
            className="w-4 h-4 text-gray-400 flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
            />
          </svg>
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">{row.name}</p>
            {row.description && (
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{row.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'last_execution',
      label: 'Last Execution',
      sortable: true,
      render: (row) =>
        row.running ? (
          <span className="flex items-center gap-1.5 text-teal-600 text-sm">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Running…
          </span>
        ) : row.last_execution ? (
          <span className="text-gray-500 dark:text-gray-400 text-sm">
            {formatDateTime(row.last_execution as string)}
          </span>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        ),
    },
    {
      key: '_actions',
      label: '',
      width: '120px',
      render: (row) => (
        <div
          className="flex items-center gap-0.5 justify-end opacity-0 group-hover/row:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            title="Execute task"
            disabled={!!row.running}
            onClick={() => {
              setExecutingTask(row);
              setExecuteOpen(true);
            }}
            className="p-1.5 text-gray-400 hover:text-teal-600 disabled:opacity-30 transition-colors rounded"
          >
            <Play className="w-4 h-4" />
          </button>
          <button
            title="Edit task"
            onClick={() => openEdit(row)}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors rounded"
          >
            <Settings2 className="w-4 h-4" />
          </button>
          <button
            title="Delete task"
            onClick={() => taskDelete.confirm(row)}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      title="Tasks"
      description="Trigger builds or other common use-cases like product syncs and publishing tasks."
      action={
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
        >
          <Plus className="size-4" />
          Create Task
        </button>
      }
    >
      <div className="mb-6">
        <SearchBar value={search} onChange={setSearch} placeholder="Search tasks…" />
      </div>

      <DataTable
        columns={COLUMNS}
        data={tasks}
        keyField="id"
        sort={sort}
        onSort={(field, direction) => setSort({ field, direction })}
        isLoading={isLoading}
        emptyMessage="No tasks found"
        onRowClick={openEdit}
        rowClassName="group/row"
      />

      {!isLoading && total > 0 && (
        <p className="mt-3 text-xs text-gray-400">
          {total} task{total !== 1 ? 's' : ''} total
        </p>
      )}

      <CrudSidebarForm
        open={sidebarOpen}
        onClose={closeSidebar}
        title={sidebarMode === 'create' ? 'New Task' : 'Edit Task'}
        isSubmitting={isSubmitting}
        isDirty={form.formState.isDirty}
        onSubmit={onSubmit}
        width="w-[480px]"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('name')}
              placeholder="e.g. Sync job"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Description
            </label>
            <textarea
              {...register('description')}
              placeholder="e.g. Trigger a sync of all published content"
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Task type
            </label>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-teal-600 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Webhook</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Webhook
            </label>
            <input
              type="url"
              {...register('webhook_url')}
              placeholder="https://mydomain.com/my-post-endpoint"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Provide the endpoint where you want to send a POST request. The payload contains the
              task and space id. E.g.:{' '}
              {`{"task": {"id": 1, "name": "Sync job"}, "space_id": 12345}`}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              User dialog
            </label>
            <textarea
              {...register('user_dialog')}
              rows={8}
              className={`w-full px-3 py-2 border rounded-lg text-xs font-mono bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none ${
                errors.user_dialog ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'
              }`}
            />
            {errors.user_dialog && (
              <p className="mt-1 text-xs text-red-500">{errors.user_dialog.message}</p>
            )}
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              User dialog is a dialog which pops up when the user wants to execute the task.
            </p>
          </div>

          {errors.root && <p className="text-sm text-red-500">{errors.root.message}</p>}
        </div>
      </CrudSidebarForm>

      <ExecuteDialog
        open={executeOpen}
        task={executingTask}
        spaceId={spaceId}
        onClose={() => setExecuteOpen(false)}
        onExecuted={handleExecuted}
      />

      {taskDelete.modal}
    </PageLayout>
  );
}
