'use client';

import { useState } from 'react';
import { Pencil, Trash2, TriangleAlert } from 'lucide-react';
import { SelectDropdown } from '@/components/ui/select-dropdown';
import { CrudSidebarForm } from '@/components/ui/crud-sidebar-form';
import { CopyButton } from '@/components/ui/copy-button';
import { useApi } from '@/lib/swr';
import { useDelete } from '@/hooks/use-delete';
import { FormField, inputCls } from '@/components/ui/form-field';
import type { PersonalAccessToken } from '@sbx/types';
import { formatDateTime as formatDate, formatDate as formatDateOnly } from '@/lib/date';

const EXPIRY_OPTIONS = [
  { label: '30 days', days: 30 },
  { label: '60 days', days: 60 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
  { label: 'No expiration', days: 0 },
];

export default function TokensPage() {
  const { data, mutate } = useApi<{ tokens: PersonalAccessToken[] }>('/api/admin/tokens');
  const tokens = data?.tokens ?? [];

  const [showForm, setShowForm] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [expiryDays, setExpiryDays] = useState(90);
  const [generating, setGenerating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  const [editToken, setEditToken] = useState<PersonalAccessToken | null>(null);
  const [editName, setEditName] = useState('');
  const [editIsDirty, setEditIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const tokenDelete = useDelete<PersonalAccessToken>({
    getUrl: (t) => `/api/admin/tokens/${t.id}`,
    onSuccess: () => mutate(),
    title: 'Delete token',
    getMessage: () => 'Are you sure you want to delete this token? This action cannot be undone.',
  });

  async function handleGenerate() {
    if (!tokenName.trim()) return;
    setGenerating(true);
    const res = await fetch('/api/admin/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: tokenName, expiresInDays: expiryDays || undefined }),
    });
    if (res.ok) {
      const data = await res.json();
      setNewToken(data.token);
      setTokenName('');
      mutate();
    }
    setGenerating(false);
  }

  async function handleSaveEdit() {
    if (!editToken || !editName.trim()) return;
    setSaving(true);
    await fetch(`/api/admin/tokens/${editToken.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName }),
    });
    setSaving(false);
    setEditIsDirty(false);
    setEditToken(null);
    mutate();
  }

  function openEdit(token: PersonalAccessToken) {
    setEditToken(token);
    setEditName(token.name);
    setEditIsDirty(false);
  }

  const expiryDate = expiryDays
    ? formatDateOnly(new Date(Date.now() + expiryDays * 86400000))
    : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Personal access token
      </h1>

      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Tokens that have been generated to access the{' '}
          <span className="underline">SBX Management API</span>
        </h2>
        <p className="text-sm text-gray-400">
          Personal access tokens work like ordinary OAuth access tokens. They can be used to
          authenticate yourself to have full access to the management API programmatically and
          should NEVER be exposed in public.
        </p>
      </div>

      <div className="border-t border-gray-100 dark:border-gray-800">
        {tokens.map((token) => (
          <div
            key={token.id}
            className="flex items-start justify-between py-4 border-b border-gray-100 dark:border-gray-800"
          >
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {token.name} (••••••••••••{token.lastFour})
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Generated: {formatDate(token.createdAt)}
              </p>
              {token.expiresAt && (
                <p className="text-xs text-gray-400">
                  The token will expire on {formatDateOnly(token.expiresAt)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              <button
                type="button"
                onClick={() => openEdit(token)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 transition-colors"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => tokenDelete.confirm(token)}
                className="text-gray-400 hover:text-red-500 p-1 transition-colors"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {!showForm && !newToken && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-4 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Generate new token
        </button>
      )}

      {showForm && !newToken && (
        <div className="mt-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Provide a expiration date to your new token
          </h3>

          <FormField label="Name">
            <input
              type="text"
              placeholder="Enter your token name"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              className={inputCls}
            />
          </FormField>

          <FormField label="Expiration">
            <div className="flex items-center gap-4">
              <SelectDropdown
                value={String(expiryDays)}
                onChange={(v) => v && setExpiryDays(Number(v))}
                options={EXPIRY_OPTIONS.map((o) => ({ value: String(o.days), label: o.label }))}
                className="w-40"
              />
              {expiryDate && (
                <span className="text-sm text-gray-400">The token will expire on {expiryDate}</span>
              )}
            </div>
          </FormField>

          <div className="flex items-start gap-2 text-sm text-gray-500">
            <TriangleAlert className="size-4 shrink-0 mt-0.5" />
            Please copy this personal access token now. It will be visible only once.
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !tokenName.trim()}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {generating ? 'Generating...' : 'Generate & Copy token'}
          </button>

          <div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {newToken && (
        <div className="mt-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 space-y-3">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Your new token:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-gray-100 break-all">
              {newToken}
            </code>
            <CopyButton text={newToken} title="Copy token" className="shrink-0 rounded" />
          </div>
          <p className="text-xs text-gray-400">Save this token now — it will not be shown again.</p>
          <button
            type="button"
            onClick={() => {
              setNewToken(null);
              setShowForm(false);
            }}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Done
          </button>
        </div>
      )}

      {tokenDelete.modal}

      <CrudSidebarForm
        open={editToken !== null}
        onClose={() => setEditToken(null)}
        title="Edit token"
        isSubmitting={saving}
        isDirty={editIsDirty}
        onSubmit={handleSaveEdit}
        noForm
      >
        <FormField label="Name">
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
      </CrudSidebarForm>
    </div>
  );
}
