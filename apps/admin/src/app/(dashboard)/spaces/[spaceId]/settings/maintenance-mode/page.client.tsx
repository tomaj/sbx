'use client';

import { useState, useEffect, use } from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import { SettingsSection } from '@/components/ui/settings-section';
import { useApi } from '@/lib/swr';

export default function MaintenanceModePage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params);

  const { data: spaceData, mutate: mutateSpace } = useApi<any>(
    `/api/admin/spaces/${spaceId}/space`,
  );

  const [enabled, setEnabled] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (spaceData?.space && !initialized) {
      setEnabled(spaceData.space.maintenance ?? false);
      setInitialized(true);
    }
  }, [spaceData, initialized]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/space`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maintenance: enabled }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Failed to save');
      }
      await mutateSpace();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl px-10 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Maintenance mode</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <Check className="w-4 h-4" />
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
        </button>
      </div>

      {error && <p className="mb-5 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <SettingsSection
        title="Maintenance mode"
        description="When enabled, only admins can edit content. Other users will see a maintenance notice and their save actions will be blocked."
      >
        {enabled && (
          <div className="flex items-start gap-3 p-3 mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Maintenance mode is currently <strong>active</strong>. Only admins can make changes.
            </p>
          </div>
        )}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Enable maintenance mode</span>
        </label>
      </SettingsSection>
    </div>
  );
}
