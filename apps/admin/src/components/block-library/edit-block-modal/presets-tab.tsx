'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Copy } from 'lucide-react';
import { useApi } from '@/lib/swr';
import { inputCls } from '@/components/ui/form-field';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { PresetFieldRow } from './preset-field-row';
import type { WorkingField } from './types';

interface Preset {
  id: number;
  name: string;
  preset: Record<string, any>;
  component_id: number;
  image: string | null;
  color: string | null;
  icon: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface PresetsTabProps {
  spaceId: string;
  componentId: string;
  componentName: string;
  schemaFields: WorkingField[];
}

export function PresetsTab({ spaceId, componentId, componentName, schemaFields }: PresetsTabProps) {
  const { data, isLoading, mutate } = useApi<{ presets: Preset[] }>(
    `/api/admin/spaces/${spaceId}/presets?component_id=${componentId}`,
  );
  const presets = data?.presets ?? [];

  const [editing, setEditing] = useState<Preset | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Preset | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [presetValues, setPresetValues] = useState<Record<string, any>>({});

  function openCreate() {
    setName('');
    setDescription('');
    setPresetValues({ component: componentName });
    setCreating(true);
    setEditing(null);
    setError(null);
  }

  function openEdit(preset: Preset) {
    setName(preset.name);
    setDescription(preset.description ?? '');
    setPresetValues(preset.preset ?? {});
    setEditing(preset);
    setCreating(false);
    setError(null);
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setError(null);
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        preset: {
          name: name.trim(),
          description: description.trim() || null,
          component_id: Number(componentId),
          preset: presetValues,
        },
      };

      if (editing) {
        const res = await fetch(`/api/admin/spaces/${spaceId}/presets/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to update preset');
      } else {
        const res = await fetch(`/api/admin/spaces/${spaceId}/presets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to create preset');
      }
      await mutate();
      closeForm();
    } catch (e: any) {
      setError(e.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await fetch(`/api/admin/spaces/${spaceId}/presets/${deleting.id}`, {
        method: 'DELETE',
      });
      await mutate();
      setDeleting(null);
    } catch {
      setDeleting(null);
    }
  }

  async function handleDuplicate(preset: Preset) {
    try {
      await fetch(`/api/admin/spaces/${spaceId}/presets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset: {
            name: `${preset.name} (copy)`,
            description: preset.description,
            component_id: Number(componentId),
            preset: preset.preset,
            image: preset.image,
            color: preset.color,
            icon: preset.icon,
          },
        }),
      });
      await mutate();
    } catch {}
  }

  function setFieldValue(key: string, value: any) {
    setPresetValues((prev) => ({ ...prev, [key]: value }));
  }

  // ── Form view ──────────────────────────────────────────────────────────────
  if (creating || editing) {
    return (
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {editing ? 'Edit Preset' : 'New Preset'}
          </h3>
          <button
            type="button"
            onClick={closeForm}
            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Cancel
          </button>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            placeholder="Preset name"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputCls}
            placeholder="What this preset is for..."
          />
        </div>

        {/* Field values */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Default field values
          </label>
          <div className="space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            {schemaFields.length === 0 && (
              <p className="text-sm text-gray-400">No fields defined on this block</p>
            )}
            {schemaFields.map((field) => (
              <PresetFieldRow
                key={field.key}
                fieldKey={field.key}
                type={field.def.type}
                displayName={(field.def as any).display_name || field.key}
                value={presetValues[field.key]}
                onChange={(v) => setFieldValue(field.key, v)}
              />
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={closeForm}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {presets.length} preset{presets.length !== 1 ? 's' : ''}
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-700 dark:text-teal-400 border border-teal-600/30 dark:border-teal-500/30 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Preset
        </button>
      </div>

      {presets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <p className="text-sm mb-1">No presets yet</p>
          <p className="text-xs">
            Presets let you save default field values to quickly configure new blocks.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="group flex items-center gap-3 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {preset.name}
                </p>
                {preset.description && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">{preset.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">
                  {
                    Object.keys(preset.preset ?? {}).filter(
                      (k) => k !== 'component' && k !== '_uid',
                    ).length
                  }{' '}
                  field value
                  {Object.keys(preset.preset ?? {}).filter((k) => k !== 'component' && k !== '_uid')
                    .length !== 1
                    ? 's'
                    : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => openEdit(preset)}
                  title="Edit"
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDuplicate(preset)}
                  title="Duplicate"
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(preset)}
                  title="Delete"
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!deleting}
        title="Delete preset"
        message={`Are you sure you want to delete "${deleting?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
