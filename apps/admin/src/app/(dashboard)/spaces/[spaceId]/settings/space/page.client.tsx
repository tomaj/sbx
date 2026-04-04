'use client';

import { useState, useEffect, use } from 'react';
import { Check } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import { SelectDropdown } from '@/components/ui/select-dropdown';
import type { SpaceDetail } from '@sbx/types';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { UnsavedChangesModal } from '@/components/ui/unsaved-changes-modal';
import { SettingsSection } from '@/components/ui/settings-section';
import { FormField, inputCls } from '@/components/ui/form-field';
import { useApi } from '@/lib/swr';

interface ContentType {
  name: string;
  display_name: string | null;
}

export default function SpaceSettingsPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params);

  const { data: spaceData, mutate: mutateSpace } = useApi<any>(
    `/api/admin/spaces/${spaceId}/space`,
  );
  const { data: componentsData, isLoading: loadingTypes } = useApi<any>(
    `/api/admin/spaces/${spaceId}/components?per_page=100`,
  );

  const space: SpaceDetail | null = spaceData?.space ?? null;

  const contentTypes: ContentType[] = (componentsData?.components ?? [])
    .filter((c: any) => c.is_root)
    .map((c: any) => ({ name: c.name, display_name: c.display_name }));

  const [name, setName] = useState('');
  const [defaultRoot, setDefaultRoot] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
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
    if (spaceData?.space && !initialized) {
      setName(spaceData.space.name);
      setDefaultRoot(spaceData.space.default_root ?? null);
      setInitialized(true);
    }
  }, [spaceData, initialized]);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/space`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, default_root: defaultRoot }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Failed to save');
      }
      const data = await res.json();
      if (data.space) {
        setName(data.space.name);
        setDefaultRoot(data.space.default_root ?? null);
      }
      await mutateSpace();
      setIsDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const contentTypeOptions = contentTypes.map((c) => ({
    value: c.name,
    label: c.display_name || c.name,
  }));

  return (
    <div className="max-w-2xl px-10 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Space</h1>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <Check className="w-4 h-4" />
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
        </button>
      </div>

      {error && <p className="mb-5 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {/* Space Name + ID */}
      <SettingsSection>
        <FormField label="Space Name" required maxLength={100} currentLength={name.length}>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setIsDirty(true);
            }}
            maxLength={100}
            className={inputCls}
          />
        </FormField>

        <div className="flex gap-4">
          <div className="flex-1">
            <FormField label="Space ID" description="Provide this ID in your support tickets">
              <div className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                  #{space?.id ?? '...'}
                </span>
                <CopyButton text={space ? String(space.id) : ''} />
              </div>
            </FormField>
          </div>

          <div className="flex-1">
            <FormField label="Server Location">
              <div className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                <span className="text-sm text-gray-700 dark:text-gray-300">EU</span>
              </div>
            </FormField>
          </div>
        </div>
      </SettingsSection>

      {/* Content Types */}
      <SettingsSection title="Content Types">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          You can choose the default content type. It is required to have the default content type
          of the space defined.
        </p>
        <FormField label="Default content type">
          <SelectDropdown
            value={defaultRoot}
            onChange={(v) => {
              setDefaultRoot(v);
              setIsDirty(true);
            }}
            options={contentTypeOptions}
            placeholder="Select a content type..."
            loading={loadingTypes}
          />
        </FormField>
      </SettingsSection>

      <UnsavedChangesModal
        open={showUnsavedModal}
        onConfirm={confirmUnsaved}
        onCancel={cancelUnsaved}
      />
    </div>
  );
}
