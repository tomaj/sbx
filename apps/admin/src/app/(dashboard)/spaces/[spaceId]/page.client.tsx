'use client';

import { use, useState, useCallback } from 'react';
import { useApi } from '@/lib/swr';
import { ContentActivitiesChart } from '@/components/dashboard/content-activities-chart';
import { ApiRequestsChart } from '@/components/dashboard/api-requests-chart';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { ActivityCard } from '@/components/dashboard/activity-card';

interface SpaceInfo {
  id: number;
  name: string;
}

interface Stats {
  stories: number | null;
  assets: number | null;
  blocks: number | null;
  datasources: number | null;
  users: number | null;
}

interface ActivityRow {
  id: number;
  activity: {
    id: number;
    key: string;
    trackable_id: number | null;
    trackable_type: string | null;
    created_at: string;
  };
  trackable: { id: string | number; name: string; slug: string } | null;
  user: {
    id: number;
    userid: string;
    friendly_name: string;
    avatar: string | null;
  } | null;
}

export default function SpaceDashboardPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params);

  const { data: spaceData } = useApi<{ space: SpaceInfo }>(`/api/admin/spaces/${spaceId}/space`);
  const space = spaceData?.space ?? null;

  const { data: storiesData } = useApi<{ total?: number }>(
    `/api/admin/spaces/${spaceId}/stories?per_page=1`,
  );
  const { data: assetsData } = useApi<{ total?: number }>(
    `/api/admin/spaces/${spaceId}/assets/counts`,
  );
  const { data: blocksData } = useApi<{ components?: unknown[] }>(
    `/api/admin/spaces/${spaceId}/components`,
  );
  const { data: dsData } = useApi<{ total?: number }>(
    `/api/admin/spaces/${spaceId}/datasources?per_page=1`,
  );
  const { data: colData } = useApi<{ collaborators?: unknown[] }>(
    `/api/admin/spaces/${spaceId}/collaborators`,
  );

  const stats: Stats = {
    stories: storiesData !== undefined ? (storiesData.total ?? 0) : null,
    assets: assetsData !== undefined ? (assetsData.total ?? 0) : null,
    blocks: blocksData !== undefined ? (blocksData.components ?? []).length : null,
    datasources: dsData !== undefined ? (dsData.total ?? 0) : null,
    users: colData !== undefined ? (colData.collaborators ?? []).length : null,
  };

  const [lastActivity, setLastActivity] = useState<ActivityRow | undefined>(undefined);
  const handleLastActivityChange = useCallback((activity: ActivityRow | undefined) => {
    setLastActivity(activity);
  }, []);

  return (
    <div className="p-8 space-y-8">
      <DashboardHeader spaceId={spaceId} space={space} lastActivity={lastActivity} />
      <StatsCards spaceId={spaceId} stats={stats} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ApiRequestsChart spaceId={spaceId} />
        <ContentActivitiesChart spaceId={spaceId} />
      </div>
      <ActivityCard spaceId={spaceId} onLastActivityChange={handleLastActivityChange} />
    </div>
  );
}
