'use client';

import { useState, use } from 'react';
import { Plus, Trash2, History, Settings, ChevronRight } from 'lucide-react';
import { z } from 'zod';
import { Controller } from 'react-hook-form';
import { CrudSidebarForm } from '@/components/ui/crud-sidebar-form';
import { Toggle } from '@/components/ui/toggle';
import { EmptyState } from '@/components/ui/empty-state';
import { useDelete } from '@/hooks/use-delete';
import { useCrudSidebar } from '@/hooks/use-crud-sidebar';
import { useCrudForm } from '@/hooks/use-crud-form';
import { useApi } from '@/lib/swr';
import type { Webhook } from '@sbx/types';
import { SkeletonText, SkeletonBlock } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FormField, inputCls } from '@/components/ui/form-field';

// ─── Trigger definitions ──────────────────────────────────────────────────────

interface TriggerDef {
  value: string;
  label: string;
}
interface TriggerGroup {
  label: string;
  triggers: TriggerDef[];
}

const TRIGGER_GROUPS: TriggerGroup[] = [
  {
    label: 'Story',
    triggers: [
      { value: 'story.published', label: 'Published' },
      { value: 'story.unpublished', label: 'Unpublished' },
      { value: 'story.deleted', label: 'Deleted' },
      { value: 'story.moved', label: 'Moved' },
    ],
  },
  {
    label: 'Datasource',
    triggers: [{ value: 'datasource.entries_updated', label: 'Entries Updated' }],
  },
  {
    label: 'Asset',
    triggers: [
      { value: 'asset.created', label: 'Created' },
      { value: 'asset.replaced', label: 'Replaced' },
      { value: 'asset.deleted', label: 'Deleted' },
      { value: 'asset.restored', label: 'Restored' },
    ],
  },
  {
    label: 'User management',
    triggers: [
      { value: 'user.added', label: 'Added' },
      { value: 'user.removed', label: 'Removed' },
      { value: 'user.roles_updated', label: 'Roles Updated' },
    ],
  },
  { label: 'Workflow', triggers: [{ value: 'stage.changed', label: 'Stage Changed' }] },
  { label: 'Pipeline', triggers: [{ value: 'pipeline.deployed', label: 'Deployed' }] },
  { label: 'Release', triggers: [{ value: 'release.merged', label: 'Merged' }] },
];

const ALL_TRIGGERS = TRIGGER_GROUPS.flatMap((g) => g.triggers.map((t) => t.value));

// ─── Zod schema ───────────────────────────────────────────────────────────────

const webhookSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  endpoint: z.string().min(1, 'Endpoint is required'),
  description: z.string().optional().default(''),
  secret: z.string().optional().default(''),
  actions: z.array(z.string()).default([]),
  activated: z.boolean().default(true),
});
type WebhookFormValues = z.infer<typeof webhookSchema>;

// ─── Events summary ───────────────────────────────────────────────────────────

function eventsSummary(actions: string[]): string {
  if (actions.length === 0) return '0 events';
  const groups = TRIGGER_GROUPS.filter((g) =>
    g.triggers.some((t) => actions.includes(t.value)),
  ).map((g) => g.label);
  return `${actions.length} event${actions.length !== 1 ? 's' : ''} (${groups.join(', ')})`;
}

// ─── Webhook card ─────────────────────────────────────────────────────────────

interface WebhookCardProps {
  webhook: Webhook;
  spaceId: string;
  onEdit: () => void;
  onDelete: () => void;
}

function WebhookCard({ webhook, spaceId, onEdit, onDelete }: WebhookCardProps) {
  const [hovered, setHovered] = useState(false);
  const [showLogsTooltip, setShowLogsTooltip] = useState(false);

  return (
    <div
      className="relative flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setShowLogsTooltip(false);
      }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate mb-0.5">
          {webhook.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">{webhook.endpoint}</p>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={webhook.activated ? 'success' : 'default'}>
            {webhook.activated ? 'Active' : 'Inactive'}
          </Badge>
          {webhook.actions.length > 0 && (
            <Badge variant="success">{eventsSummary(webhook.actions)}</Badge>
          )}
        </div>
      </div>

      {/* Hover actions */}
      <div
        className={`flex items-center gap-1 transition-opacity duration-150 ${hovered ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* View logs */}
        <div className="relative">
          {showLogsTooltip && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded whitespace-nowrap pointer-events-none">
              View logs
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
            </div>
          )}
          <a
            href={`/spaces/${spaceId}/settings/webhooks/logs?webhook_id=${webhook.id}`}
            onMouseEnter={() => setShowLogsTooltip(true)}
            onMouseLeave={() => setShowLogsTooltip(false)}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <History className="w-4 h-4" />
          </a>
        </div>

        <button
          onClick={onEdit}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          onClick={onDelete}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Webhook form (inside CrudSidebarForm) ────────────────────────────────────

interface WebhookFormProps {
  spaceId: string;
  webhook: Webhook | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function WebhookForm({ spaceId, webhook, open, onClose, onSaved }: WebhookFormProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const { form, onSubmit } = useCrudForm<Webhook, WebhookFormValues>({
    schema: webhookSchema,
    defaultValues: {
      name: '',
      endpoint: '',
      description: '',
      secret: '',
      actions: [],
      activated: true,
    },
    mode: webhook ? 'edit' : 'create',
    item: webhook,
    open,
    getInitialValues: (w) => ({
      name: w.name,
      endpoint: w.endpoint,
      description: w.description ?? '',
      secret: w.secret ?? '',
      actions: w.actions ?? [],
      activated: w.activated ?? true,
    }),
    buildRequest: (values, mode, item) => {
      const url = item
        ? `/api/admin/spaces/${spaceId}/webhooks/${item.id}`
        : `/api/admin/spaces/${spaceId}/webhooks`;
      return fetch(url, {
        method: item ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name.trim(),
          endpoint: values.endpoint.trim(),
          description: values.description?.trim() || null,
          secret: values.secret?.trim() || null,
          actions: values.actions,
          activated: values.activated,
        }),
      });
    },
    onSuccess: onSaved,
  });

  function toggleExpandGroup(label: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  async function handleDelete() {
    if (!webhook) return;
    await fetch(`/api/admin/spaces/${spaceId}/webhooks/${webhook.id}`, { method: 'DELETE' });
    onSaved();
  }

  const {
    formState: { errors, isSubmitting, isDirty },
  } = form;

  return (
    <CrudSidebarForm
      open={open}
      onClose={onClose}
      title={webhook ? 'Edit Webhook' : 'New Webhook'}
      isSubmitting={isSubmitting}
      isDirty={isDirty}
      onSubmit={onSubmit}
      onDelete={webhook ? handleDelete : undefined}
      deleteTitle="Delete Webhook"
      deleteMessage={`Are you sure you want to delete "${webhook?.name ?? ''}"?`}
      width="w-[480px]"
    >
      {errors.root?.message && (
        <p className="text-sm text-red-600 dark:text-red-400">{errors.root.message}</p>
      )}

      <FormField label="Name" required>
        <input
          type="text"
          placeholder="My Webhook"
          className={inputCls}
          {...form.register('name')}
        />
      </FormField>

      <div className="flex items-center justify-between mb-5">
        <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Active</label>
        <Controller
          name="activated"
          control={form.control}
          render={({ field }) => <Toggle checked={field.value} onChange={field.onChange} />}
        />
      </div>

      <FormField label="Description">
        <input
          type="text"
          placeholder="Optional"
          className={inputCls}
          {...form.register('description')}
        />
      </FormField>

      <FormField label="Endpoint URL" required>
        <input
          type="url"
          placeholder="https://example.com/webhook"
          className={inputCls}
          {...form.register('endpoint')}
        />
      </FormField>

      <FormField label="Webhook secret">
        <input
          type="text"
          placeholder="Sent as Webhook-Secret header"
          className={inputCls}
          {...form.register('secret')}
        />
      </FormField>

      <Controller
        name="actions"
        control={form.control}
        render={({ field }) => (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Triggers <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setExpandedGroups(new Set(TRIGGER_GROUPS.map((g) => g.label)))}
                  className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={() => field.onChange([...ALL_TRIGGERS])}
                  className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
                >
                  Select All Events
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Choose at least one event that should trigger your webhook.
            </p>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {TRIGGER_GROUPS.map((group, gi) => {
                const vals = group.triggers.map((t) => t.value);
                const selectedCount = vals.filter((v) => field.value.includes(v)).length;
                const allSelected = selectedCount === vals.length;
                const expanded = expandedGroups.has(group.label);

                return (
                  <div
                    key={group.label}
                    className={gi > 0 ? 'border-t border-gray-200 dark:border-gray-700' : ''}
                  >
                    <div className="flex items-center gap-2 px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = selectedCount > 0 && !allSelected;
                        }}
                        onChange={() => {
                          const allSel = vals.every((v) => field.value.includes(v));
                          field.onChange(
                            allSel
                              ? field.value.filter((a) => !vals.includes(a))
                              : [...new Set([...field.value, ...vals])],
                          );
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 shrink-0"
                      />
                      <button
                        type="button"
                        onClick={() => toggleExpandGroup(group.label)}
                        className="flex-1 flex items-center justify-between text-sm text-gray-700 dark:text-gray-300"
                      >
                        <span className="flex items-center gap-1.5">
                          <ChevronRight
                            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
                          />
                          {group.label}
                        </span>
                        <Badge variant={selectedCount > 0 ? 'success' : 'default'}>
                          {selectedCount} of {vals.length} event{vals.length !== 1 ? 's' : ''}
                        </Badge>
                      </button>
                    </div>
                    {expanded && (
                      <div className="px-10 pb-2.5 grid grid-cols-2 gap-y-1">
                        {group.triggers.map((t) => (
                          <label
                            key={t.value}
                            className="flex items-center gap-2 py-0.5 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={field.value.includes(t.value)}
                              onChange={() => {
                                field.onChange(
                                  field.value.includes(t.value)
                                    ? field.value.filter((a) => a !== t.value)
                                    : [...field.value, t.value],
                                );
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {t.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      />
    </CrudSidebarForm>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WebhooksPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params);
  const { data, isLoading, mutate } = useApi<{ webhook_endpoints: Webhook[] }>(
    `/api/admin/spaces/${spaceId}/webhooks`,
  );

  const {
    open: panelOpen,
    selected: selectedWebhook,
    openCreate,
    openEdit,
    close,
  } = useCrudSidebar<Webhook>();

  const webhookDelete = useDelete<Webhook>({
    getUrl: (w) => `/api/admin/spaces/${spaceId}/webhooks/${w.id}`,
    onSuccess: () => mutate(),
    title: 'Delete Webhook',
    getMessage: (w) => `Are you sure you want to delete "${w.name}"?`,
  });

  function handleSaved() {
    close();
    mutate();
  }

  return (
    <div className="max-w-3xl px-10 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Webhooks</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Notify external services when content changes.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Webhook
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900"
            >
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <SkeletonText width="w-36" />
                  <SkeletonText width="w-12" />
                </div>
                <SkeletonText width="w-64" height="h-3" />
                <div className="flex gap-1">
                  <SkeletonText width="w-24" />
                  <SkeletonText width="w-20" />
                  <SkeletonText width="w-28" />
                </div>
              </div>
              <SkeletonBlock height="h-7" width="w-7" className="shrink-0" />
            </div>
          ))}
        </div>
      ) : (data?.webhook_endpoints ?? []).length === 0 ? (
        <EmptyState
          message="No webhooks configured yet."
          action={
            <button
              onClick={openCreate}
              className="text-sm text-teal-600 dark:text-teal-400 hover:underline"
            >
              Add your first webhook
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {(data?.webhook_endpoints ?? []).map((w) => (
            <WebhookCard
              key={w.id}
              webhook={w}
              spaceId={spaceId}
              onEdit={() => openEdit(w)}
              onDelete={() => webhookDelete.confirm(w)}
            />
          ))}
        </div>
      )}

      <WebhookForm
        spaceId={spaceId}
        webhook={selectedWebhook}
        open={panelOpen}
        onClose={close}
        onSaved={handleSaved}
      />

      {webhookDelete.modal}
    </div>
  );
}
