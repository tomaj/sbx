'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { StoryEditor } from '@/components/story-editor';
import type { ComponentMeta, ComponentGroup, StoryDetail } from '@/components/story-editor/types';
import { useApi } from '@/lib/swr';

interface PageProps {
  params: Promise<{ spaceId: string; storyId: string }>;
}

interface StoryData {
  story: StoryDetail;
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
  const { data: spaceData } = useApi<SpaceData>(`/api/admin/spaces/${spaceId}/space`);
  const { data: tokensData } = useApi<TokensData>(`/api/admin/spaces/${spaceId}/access-tokens`);

  if (storyError?.status === 404) notFound();

  const tokens = tokensData?.api_keys ?? [];

  return (
    <StoryEditor
      spaceId={spaceId}
      story={data?.story ?? null}
      componentSchema={data?.component_schema ?? null}
      allComponents={data?.all_components ?? []}
      allGroups={data?.all_groups ?? []}
      domain={spaceData?.space?.domain ?? ''}
      previewUrls={spaceData?.space?.preview_urls ?? []}
      mobileWidth={spaceData?.space?.mobile_width ?? 360}
      previewToken={tokens.find((t) => t.access === 'private')?.token ?? ''}
      publicToken={tokens.find((t) => t.access === 'public')?.token ?? ''}
      releaseId={releaseId}
      releaseName={releaseData?.release?.name ?? null}
      parentDisableFEEditor={data?.parent_disable_fe_editor ?? false}
    />
  );
}
