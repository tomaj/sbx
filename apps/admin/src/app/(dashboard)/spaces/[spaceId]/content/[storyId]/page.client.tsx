'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { StoryEditor } from '@/components/story-editor';
import type { ComponentMeta, ComponentGroup, StoryDetail } from '@/components/story-editor/types';
import { useApi } from '@/lib/swr';

interface PageProps {
  params: Promise<{ spaceId: string; storyId: string }>;
}

interface StoryData {
  story: StoryDetail;
  // biome-ignore lint/suspicious/noExplicitAny: dynamic params
  component_schema: Record<string, any> | null;
  parent_disable_fe_editor: boolean;
  all_components: ComponentMeta[];
  all_groups: ComponentGroup[];
}

interface SpaceData {
  space: {
    domain: string;
    preview_urls: { name: string; location: string }[];
    mobile_width: number;
    encode_url: boolean;
    visual_editor_disabled: boolean;
    maintenance: boolean;
  };
}

interface TokensData {
  api_keys: { access: string; token: string }[];
}

interface ReleaseData {
  release: { name: string };
}

export default function StoryDetailPage({ params }: PageProps) {
  const { spaceId, storyId } = use(params);
  const searchParams = useSearchParams();
  const releaseId = searchParams.get('release_id')
    ? parseInt(searchParams.get('release_id')!, 10)
    : null;

  const storyUrl = releaseId
    ? `/api/admin/spaces/${spaceId}/stories/${storyId}?release_id=${releaseId}`
    : `/api/admin/spaces/${spaceId}/stories/${storyId}`;

  const { data, error: storyError } = useApi<StoryData>(storyUrl);
  const { data: releaseData } = useApi<ReleaseData>(
    releaseId != null ? `/api/admin/spaces/${spaceId}/releases/${releaseId}` : null,
  );
  const { data: spaceData, mutate: mutateSpace } = useApi<SpaceData>(
    `/api/admin/spaces/${spaceId}/space`,
  );
  const { data: tokensData } = useApi<TokensData>(`/api/admin/spaces/${spaceId}/access-tokens`);

  if (storyError?.status === 404) notFound();

  const tokens = tokensData?.api_keys ?? [];

  const maintenanceMode = spaceData?.space?.maintenance ?? false;

  async function disableMaintenance() {
    await fetch(`/api/admin/spaces/${spaceId}/space`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maintenance: false }),
    });
    await mutateSpace();
  }

  return (
    <>
      {maintenanceMode && (
        <div className="flex items-center justify-between px-6 py-2.5 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              The maintenance mode is enabled. Only admins can edit content.
            </p>
          </div>
          <button
            type="button"
            onClick={disableMaintenance}
            className="text-sm font-medium text-amber-800 dark:text-amber-200 underline underline-offset-2 hover:no-underline shrink-0"
          >
            Disable maintenance mode
          </button>
        </div>
      )}
      <StoryEditor
        spaceId={spaceId}
        story={data?.story ?? null}
        componentSchema={data?.component_schema ?? null}
        allComponents={data?.all_components ?? []}
        allGroups={data?.all_groups ?? []}
        domain={spaceData?.space?.domain ?? ''}
        previewUrls={spaceData?.space?.preview_urls ?? []}
        mobileWidth={spaceData?.space?.mobile_width ?? 360}
        encodeUrl={spaceData?.space?.encode_url ?? false}
        visualEditorDisabled={spaceData?.space?.visual_editor_disabled ?? false}
        previewToken={tokens.find((t) => t.access === 'private')?.token ?? ''}
        publicToken={tokens.find((t) => t.access === 'public')?.token ?? ''}
        releaseId={releaseId}
        releaseName={releaseData?.release?.name ?? null}
        parentDisableFEEditor={data?.parent_disable_fe_editor ?? false}
      />
    </>
  );
}
