'use client';

import { useState, use } from 'react';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { UnsavedChangesModal } from '@/components/ui/unsaved-changes-modal';
import { SkeletonText, SkeletonBlock } from '@/components/ui/skeleton';
import { useApi } from '@/lib/swr';
import type { ProvidersResponse } from './types';
import { AiConfigSection } from './ai-config-section';
import { BrandingRulesSection } from './branding-rules-section';

export default function AiSettingsPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params);

  const [tab, setTab] = useState<'general' | 'branding'>('general');

  // biome-ignore lint/suspicious/noExplicitAny: dynamic config
  const { isLoading: cfgLoading } = useApi<any>(`/api/admin/spaces/${spaceId}/ai-configurations`);
  const { isLoading: providersLoading } = useApi<ProvidersResponse>(
    `/api/admin/spaces/${spaceId}/ai-configurations/providers`,
  );
  // biome-ignore lint/suspicious/noExplicitAny: dynamic config
  const { isLoading: brandingLoading } = useApi<any>(
    `/api/admin/spaces/${spaceId}/ai-branding-rules`,
  );

  const loading = cfgLoading || providersLoading || brandingLoading;

  const [brandingIsDirty, setBrandingIsDirty] = useState(false);
  const [configFormIsDirty, setConfigFormIsDirty] = useState(false);
  const {
    showModal: showUnsavedModal,
    handleConfirm: confirmUnsaved,
    handleCancel: cancelUnsaved,
  } = useUnsavedChanges(brandingIsDirty || configFormIsDirty);

  if (loading) {
    return (
      <div className="max-w-2xl px-10 py-8 space-y-4">
        <SkeletonText className="h-8 w-48" />
        <SkeletonText className="h-4 w-80" />
        <SkeletonBlock className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl px-10 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">AI Settings</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        Configure AI provider and branding context for AI-powered features in this space.
      </p>

      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-8">
        {(['general', 'branding'] as const).map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <AiConfigSection spaceId={spaceId} onDirtyChange={setConfigFormIsDirty} />
      )}

      {tab === 'branding' && (
        <BrandingRulesSection spaceId={spaceId} onDirtyChange={setBrandingIsDirty} />
      )}

      <UnsavedChangesModal
        open={showUnsavedModal}
        onConfirm={confirmUnsaved}
        onCancel={cancelUnsaved}
      />
    </div>
  );
}
