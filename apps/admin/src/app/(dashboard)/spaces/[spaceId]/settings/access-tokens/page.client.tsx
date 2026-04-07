'use client';

import { use } from 'react';
import { Controller } from 'react-hook-form';
import { z } from 'zod';
import { CrudSidebarForm } from '@/components/ui/crud-sidebar-form';
import { CrudSettingsPage } from '@/components/ui/crud-settings-page';
import { SelectDropdown } from '@/components/ui/select-dropdown';
import { CopyButton } from '@/components/ui/copy-button';
import { AccessBadge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { useApi } from '@/lib/swr';
import { useDelete } from '@/hooks/use-delete';
import { useCrudForm } from '@/hooks/use-crud-form';
import { useCrudSidebar } from '@/hooks/use-crud-sidebar';
import type { ApiToken, Branch } from '@sbx/types';
import { SkeletonText, SkeletonBadge } from '@/components/ui/skeleton';
import { FormField, FormRootError, inputCls } from '@/components/ui/form-field';
import { RowActions, RowActionsSkeleton } from '@/components/ui/row-actions';

// ─── Zod schema ───────────────────────────────────────────────────────────────

const tokenSchema = z.object({
  name: z.string().optional(),
  access: z.enum(['public', 'private']),
  branchId: z.string().nullable().optional(),
  minCache: z.number().min(0).default(0),
});

type TokenFormValues = z.infer<typeof tokenSchema>;

// ─── Token Form (right sidebar) ───────────────────────────────────────────────

interface TokenFormProps {
  spaceId: string;
  token: ApiToken | null;
  branches: Branch[];
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function TokenForm({ spaceId, token, branches, open, onClose, onSaved }: TokenFormProps) {
  const mode = token ? 'edit' : 'create';

  const { form, onSubmit } = useCrudForm<ApiToken, TokenFormValues>({
    schema: tokenSchema,
    defaultValues: { name: '', access: 'public', branchId: null, minCache: 0 },
    mode,
    item: token,
    open,
    getInitialValues: (t) => ({
      name: t.name ?? '',
      access: (t.access === 'private' ? 'private' : 'public') as 'public' | 'private',
      branchId: t.branch_id != null ? String(t.branch_id) : null,
      minCache: t.min_cache ?? 0,
    }),
    buildRequest: (values) =>
      fetch(
        token
          ? `/api/admin/spaces/${spaceId}/access-tokens/${token.id}`
          : `/api/admin/spaces/${spaceId}/access-tokens`,
        {
          method: token ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access: values.access,
            name: values.name?.trim() || null,
            branchId: values.branchId ? parseInt(values.branchId, 10) : null,
            minCache: values.minCache,
          }),
        },
      ),
    onSuccess: () => {
      onSaved();
    },
  });

  const { isDirty, isSubmitting, errors } = form.formState;

  async function handleDelete() {
    if (!token) return;
    await fetch(`/api/admin/spaces/${spaceId}/access-tokens/${token.id}`, { method: 'DELETE' });
    onSaved();
  }

  const branchOptions = branches.map((b) => ({ value: String(b.id), label: b.name }));

  return (
    <CrudSidebarForm
      open={open}
      onClose={onClose}
      title={token ? 'Edit Access Token' : 'New Access Token'}
      isSubmitting={isSubmitting}
      isDirty={isDirty}
      onSubmit={onSubmit}
      onDelete={token ? handleDelete : undefined}
      deleteTitle="Delete Access Token"
      deleteMessage={`Are you sure you want to delete "${token?.name ?? token?.token ?? ''}"? This will break any integrations using this token.`}
      width="w-[480px]"
      noForm
    >
      <FormRootError message={errors.root?.message} />

      {token && (
        <FormField label="Key">
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
            <span className="flex-1 text-sm text-gray-600 dark:text-gray-400 font-mono truncate">
              {token.token}
            </span>
            <CopyButton text={token.token} title="Copy token" />
          </div>
        </FormField>
      )}

      <FormField label="Access level" required>
        <Controller
          control={form.control}
          name="access"
          render={({ field }) => (
            <SelectDropdown
              value={field.value}
              onChange={(v) => field.onChange((v ?? 'public') as 'public' | 'private')}
              options={[
                { value: 'public', label: 'Public' },
                { value: 'private', label: 'Preview' },
              ]}
            />
          )}
        />
      </FormField>

      <FormField label="Name">
        <input
          type="text"
          {...form.register('name')}
          placeholder="Access token name"
          className={inputCls}
        />
      </FormField>

      <FormField label="Pipeline">
        <Controller
          control={form.control}
          name="branchId"
          render={({ field }) => (
            <SelectDropdown
              value={field.value ?? null}
              onChange={(v) => field.onChange(v)}
              options={branchOptions}
              placeholder="Select..."
            />
          )}
        />
      </FormField>

      <FormField
        label="Minimum Cache TTL"
        description="Specify how long the CDN caches the content. The default value is 0 (zero seconds)."
      >
        <input
          type="number"
          min={0}
          {...form.register('minCache', { valueAsNumber: true })}
          className={inputCls}
        />
      </FormField>
    </CrudSidebarForm>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AccessTokensPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params);

  const {
    data: tokensData,
    isLoading: tokensLoading,
    mutate: mutateTokens,
  } = useApi<{ api_keys: ApiToken[] }>(`/api/admin/spaces/${spaceId}/access-tokens`);
  const { data: branchesData } = useApi<{ branches: Branch[] }>(
    `/api/admin/spaces/${spaceId}/branches`,
  );

  const tokens = tokensData?.api_keys ?? [];
  const branches = branchesData?.branches ?? [];

  const {
    open: panelOpen,
    selected: selectedToken,
    openCreate,
    openEdit,
    close,
  } = useCrudSidebar<ApiToken>();

  const tokenDelete = useDelete<ApiToken>({
    getUrl: (t) => `/api/admin/spaces/${spaceId}/access-tokens/${t.id}`,
    onSuccess: () => mutateTokens(),
    title: 'Delete Access Token',
    getMessage: (t) =>
      `Are you sure you want to delete "${t.name ?? t.token ?? ''}"? This will break any integrations using this token.`,
  });

  function handleSaved() {
    close();
    mutateTokens();
  }

  function getBranchName(branchId: number | null) {
    if (!branchId) return null;
    return branches.find((b) => b.id === branchId)?.name ?? null;
  }

  const columns: Column<ApiToken>[] = [
    {
      key: 'token',
      label: 'Token',
      render: (t) => (
        <div>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{t.name || '—'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{t.token}</p>
        </div>
      ),
      skeletonRender: () => (
        <div className="space-y-1.5">
          <SkeletonText width="w-32" />
          <SkeletonText width="w-48" height="h-3" />
        </div>
      ),
    },
    {
      key: 'access',
      label: 'Access level',
      render: (t) => <AccessBadge access={t.access} />,
      skeletonRender: () => <SkeletonBadge width="w-16" />,
    },
    {
      key: 'branch',
      label: 'Pipeline',
      render: (t) => (
        <span className="text-gray-500 dark:text-gray-400">
          {getBranchName(t.branch_id) ?? '——'}
        </span>
      ),
      skeletonRender: () => <SkeletonText width="w-20" />,
    },
    {
      key: 'actions',
      label: '',
      width: '120px',
      render: (t) => (
        <RowActions
          before={<CopyButton text={t.token} />}
          onEdit={() => openEdit(t)}
          onDelete={() => tokenDelete.confirm(t)}
        />
      ),
      skeletonRender: () => <RowActionsSkeleton count={3} />,
    },
  ];

  return (
    <CrudSettingsPage
      title="Access Tokens"
      description="Public access tokens are only for accessing the published version while preview tokens are for accessing the draft version. Both are read-only tokens."
      addLabel="New Access Token"
      onAdd={openCreate}
      sidebar={
        <TokenForm
          spaceId={spaceId}
          token={selectedToken}
          branches={branches}
          open={panelOpen}
          onClose={close}
          onSaved={handleSaved}
        />
      }
      extras={tokenDelete.modal}
    >
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <DataTable
          columns={columns as unknown as Column<Record<string, unknown>>[]}
          data={tokens as unknown as Record<string, unknown>[]}
          keyField="id"
          isLoading={tokensLoading}
          emptyMessage="No access tokens yet."
        />
      </div>
    </CrudSettingsPage>
  );
}
