'use client';

import { useState, useEffect } from 'react';
import { FormField, inputCls } from '@/components/ui/form-field';

interface NewDatasourceModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  spaceId: string;
}

export function NewDatasourceModal({ open, onClose, onCreated, spaceId }: NewDatasourceModalProps) {
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
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop dismiss
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
      onClick={onClose}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: dialog content */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation */}
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

          <div className="space-y-1">
            <FormField label="Name" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
              />
            </FormField>
            <FormField label="ID/Slug" required>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                }}
                className={inputCls}
              />
            </FormField>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
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
