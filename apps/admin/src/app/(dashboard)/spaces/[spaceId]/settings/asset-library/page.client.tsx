'use client';

import { useState, useEffect, use } from 'react';
import { Check, Plus, Trash2, Minus } from 'lucide-react';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { UnsavedChangesModal } from '@/components/ui/unsaved-changes-modal';
import { SettingsSection } from '@/components/ui/settings-section';
import { useApi } from '@/lib/swr';

interface DefaultMetadataField {
  required: boolean;
  translatable: boolean;
}

interface DefaultMetadataFields {
  altText: DefaultMetadataField;
  titleCaption: DefaultMetadataField;
  copyright: DefaultMetadataField;
  source: DefaultMetadataField;
}

// Storyblok-compatible custom metadata field schema
interface CustomMetadataField {
  key: string;
  required: boolean;
  filetypes: string[]; // ['any'] | subset of ['images','videos','audios','texts']
  translatable: boolean;
}

interface AssetLibrarySettings {
  defaultMetadataFields: DefaultMetadataFields;
  customMetadataFields: CustomMetadataField[];
  uploadLimitMb: number;
}

const DEFAULT_SETTINGS: AssetLibrarySettings = {
  defaultMetadataFields: {
    altText: { required: true, translatable: false },
    titleCaption: { required: true, translatable: false },
    copyright: { required: false, translatable: false },
    source: { required: false, translatable: false },
  },
  customMetadataFields: [],
  uploadLimitMb: 5,
};

const FILETYPE_OPTIONS = [
  { value: 'any', label: 'Any filetype' },
  { value: 'images', label: 'Images' },
  { value: 'videos', label: 'Videos' },
  { value: 'audios', label: 'Audio' },
  { value: 'texts', label: 'Documents / Text' },
];

const DEFAULT_FIELD_LABELS: Record<keyof DefaultMetadataFields, string> = {
  altText: 'Alt Text',
  titleCaption: 'Title/Caption',
  copyright: 'Copyright',
  source: 'Source',
};

export default function AssetLibraryPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params);

  const { data: spaceData } = useApi<{ space: { asset_library_settings?: AssetLibrarySettings } }>(
    `/api/admin/spaces/${spaceId}/space`,
  );

  const [settings, setSettings] = useState<AssetLibrarySettings>(DEFAULT_SETTINGS);
  const [initialized, setInitialized] = useState(false);
  const [newCustomField, setNewCustomField] = useState<CustomMetadataField>({
    key: '',
    filetypes: ['any'],
    required: false,
    translatable: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const {
    showModal: showUnsavedModal,
    handleConfirm: confirmUnsaved,
    handleCancel: cancelUnsaved,
  } = useUnsavedChanges(isDirty);

  useEffect(() => {
    if (
      spaceData?.space?.asset_library_settings &&
      Object.keys(spaceData.space.asset_library_settings).length > 0 &&
      !initialized
    ) {
      const s = spaceData.space.asset_library_settings as AssetLibrarySettings;
      setSettings({
        defaultMetadataFields: {
          altText:
            s.defaultMetadataFields?.altText ?? DEFAULT_SETTINGS.defaultMetadataFields.altText,
          titleCaption:
            s.defaultMetadataFields?.titleCaption ??
            DEFAULT_SETTINGS.defaultMetadataFields.titleCaption,
          copyright:
            s.defaultMetadataFields?.copyright ?? DEFAULT_SETTINGS.defaultMetadataFields.copyright,
          source: s.defaultMetadataFields?.source ?? DEFAULT_SETTINGS.defaultMetadataFields.source,
        },
        customMetadataFields: s.customMetadataFields ?? [],
        uploadLimitMb: s.uploadLimitMb ?? 5,
      });
      setInitialized(true);
    }
  }, [spaceData, initialized]);

  function updateSettings(updater: (s: AssetLibrarySettings) => AssetLibrarySettings) {
    setSettings(updater);
    setIsDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/space`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_library_settings: settings }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Failed to save');
      }
      setIsDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function updateDefaultField(
    field: keyof DefaultMetadataFields,
    key: 'required' | 'translatable',
    value: boolean,
  ) {
    updateSettings((s) => ({
      ...s,
      defaultMetadataFields: {
        ...s.defaultMetadataFields,
        [field]: { ...s.defaultMetadataFields[field], [key]: value },
      },
    }));
  }

  function addCustomField() {
    if (!newCustomField.key.trim()) return;
    updateSettings((s) => ({
      ...s,
      customMetadataFields: [
        ...s.customMetadataFields,
        { ...newCustomField, key: newCustomField.key.trim() },
      ],
    }));
    setNewCustomField({ key: '', filetypes: ['any'], required: false, translatable: false });
  }

  function removeCustomField(index: number) {
    updateSettings((s) => ({
      ...s,
      customMetadataFields: s.customMetadataFields.filter((_, i) => i !== index),
    }));
  }

  return (
    <div className="max-w-2xl px-10 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Asset Library</h1>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <Check className="w-4 h-4" />
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
        </button>
      </div>

      {error && <p className="mb-5 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {/* Default metadata fields */}
      <SettingsSection
        title="Default metadata fields"
        description="If you set required fields the user will be forced to fill out those fields when uploading a new asset. If you set translatable fields the user will be able to translate that field to the different languages defined at Internationalization."
      >
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Default Metadata Fields
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center w-24">
                  Required
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center w-28">
                  Translatable
                </th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(DEFAULT_FIELD_LABELS) as (keyof DefaultMetadataFields)[]).map(
                (field, idx, arr) => (
                  <tr
                    key={field}
                    className={
                      idx < arr.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''
                    }
                  >
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                      {DEFAULT_FIELD_LABELS[field]}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={settings.defaultMetadataFields[field].required}
                        onChange={(e) => updateDefaultField(field, 'required', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={settings.defaultMetadataFields[field].translatable}
                        onChange={(e) =>
                          updateDefaultField(field, 'translatable', e.target.checked)
                        }
                        className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </SettingsSection>

      {/* Custom metadata fields */}
      <SettingsSection
        title="Custom metadata fields"
        description="If you set fields as required, the user will be forced to fill them in when uploading a new asset. The name field must contain letters but also allows numbers, dash (-), and underscore (_). The custom metadata name must be unique."
      >
        {/* Existing custom fields */}
        {settings.customMetadataFields.length > 0 && (
          <div className="mb-4 space-y-2">
            {settings.customMetadataFields.map((field, idx) => (
              <div
                key={field.key}
                className="flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <span className="flex-1 text-sm text-gray-900 dark:text-gray-100 font-medium font-mono">
                  {field.key}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                  {field.filetypes?.includes('any') || !field.filetypes?.length
                    ? 'Any filetype'
                    : field.filetypes
                        .map((ft) => FILETYPE_OPTIONS.find((o) => o.value === ft)?.label ?? ft)
                        .join(', ')}
                </span>
                {field.required && (
                  <span className="text-xs text-teal-700 dark:text-teal-400 px-2 py-1 bg-teal-50 dark:bg-teal-900/20 rounded">
                    Required
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeCustomField(idx)}
                  className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new custom field */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newCustomField.key}
            onChange={(e) => setNewCustomField((f) => ({ ...f, key: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && addCustomField()}
            placeholder="key_name"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
          />
          <select
            value={newCustomField.filetypes[0] ?? 'any'}
            onChange={(e) => setNewCustomField((f) => ({ ...f, filetypes: [e.target.value] }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
          >
            {FILETYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={newCustomField.required}
              onChange={(e) => setNewCustomField((f) => ({ ...f, required: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Required</span>
          </label>
          <button
            type="button"
            onClick={addCustomField}
            disabled={!newCustomField.key.trim()}
            className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>
      </SettingsSection>

      {/* Assets size limits */}
      <SettingsSection
        title="Assets size limits"
        description="If you set an upload limit, the users will be restricted to upload files up to this limit. This custom limit should be lower than your plan limit (5000MB)."
      >
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Upload limit per file (in MB)
        </p>
        <div className="flex items-center gap-0 w-40">
          <button
            type="button"
            onClick={() =>
              updateSettings((s) => ({ ...s, uploadLimitMb: Math.max(1, s.uploadLimitMb - 1) }))
            }
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <input
            type="number"
            value={settings.uploadLimitMb}
            onChange={(e) =>
              updateSettings((s) => ({
                ...s,
                uploadLimitMb: Math.max(1, parseInt(e.target.value, 10) || 5),
              }))
            }
            className="flex-1 px-3 py-2 border-y border-gray-300 dark:border-gray-600 text-sm text-center text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 w-16"
          />
          <button
            type="button"
            onClick={() =>
              updateSettings((s) => ({ ...s, uploadLimitMb: Math.min(5000, s.uploadLimitMb + 1) }))
            }
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-r-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </SettingsSection>

      <UnsavedChangesModal
        open={showUnsavedModal}
        onConfirm={confirmUnsaved}
        onCancel={cancelUnsaved}
      />
    </div>
  );
}
