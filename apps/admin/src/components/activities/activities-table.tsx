'use client';

import { useState } from 'react';
import { usePerPage } from '@/hooks/use-per-page';
import { useApi } from '@/lib/swr';
import { DataTable, type Column } from '@/components/ui/data-table';
import { SelectDropdown } from '@/components/ui/select-dropdown';
import { CheckboxDropdown } from '@/components/ui/checkbox-dropdown';
import { DateField } from '@/components/ui/date-field';
import { UserAvatar } from '@/components/ui/user-avatar';
import { SkeletonTimeCell, SkeletonUserCell } from '@/components/ui/skeleton';
import {
  ACTIVITY_TYPES,
  formatActivityKey,
  formatActivityTime,
  activityKeyColor,
  resolveItemName,
} from '@/components/activities/activity-utils';
import type { ActivityRow } from '@sbx/types';

interface ActivityUser {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  avatar: string | null;
}

interface ActivitySpace {
  id: number;
  name: string;
}

interface ActivitiesTableProps {
  /**
   * 'space' — shows activities for a single space (no space selector).
   *           Pass `spaceId` prop; activities URL is /api/admin/activities?spaceId=...
   * 'org'   — shows activities across spaces. Space selector shown;
   *           `spaceId` prop not required.
   */
  scope: 'space' | 'org';
  spaceId?: string;
  storageKey?: string;
}

/**
 * Shared activities table used in:
 *  - spaces/[spaceId]/activities — scope="space"
 *  - organization/activities     — scope="org"
 */
export function ActivitiesTable({ scope, spaceId: propSpaceId, storageKey }: ActivitiesTableProps) {
  const perPageKey = storageKey ?? `perPage:activities-${scope}`;

  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(
    scope === 'space' ? (propSpaceId ?? null) : null,
  );
  const [activityKeys, setActivityKeys] = useState<string[]>([]);
  const [userIds, setUserIds] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = usePerPage(perPageKey, 25);

  const activeSpaceId = scope === 'space' ? propSpaceId : selectedSpaceId;

  const { data: spacesData } = useApi<{ spaces: ActivitySpace[] }>(
    scope === 'org' ? '/api/admin/spaces' : null,
  );
  const { data: usersData } = useApi<{ users: ActivityUser[] }>(
    '/api/admin/users?per_page=100&filter=all',
  );

  const spaces = spacesData?.spaces ?? [];
  const users = usersData?.users ?? [];

  const activitiesUrl = activeSpaceId
    ? (() => {
        const params = new URLSearchParams({
          spaceId: activeSpaceId,
          page: String(page),
          per_page: String(perPage),
        });
        if (activityKeys.length) params.set('types', activityKeys.join(','));
        if (userIds.length) params.set('by_owner_ids', userIds.join(','));
        if (dateFrom) params.set('created_at_gte', dateFrom);
        if (dateTo) params.set('created_at_lte', dateTo);
        return `/api/admin/activities?${params}`;
      })()
    : null;

  const { data: activitiesData, isLoading: loading } = useApi<{
    activities: ActivityRow[];
    total: number;
  }>(activitiesUrl);

  const rows = activitiesData?.activities ?? [];
  const total = activitiesData?.total ?? 0;

  const selectedSpace = spaces.find((s) => String(s.id) === activeSpaceId);

  const columns: Column<ActivityRow>[] = [
    {
      key: 'time',
      label: 'Time',
      width: '130px',
      render: (row) => {
        const { date, time } = formatActivityTime(row.activity.created_at);
        return (
          <div>
            <p className="text-sm text-gray-900 dark:text-gray-100">{date}</p>
            <p className="text-xs text-gray-400">{time}</p>
          </div>
        );
      },
      skeletonRender: () => <SkeletonTimeCell />,
    },
    {
      key: 'user',
      label: 'User',
      render: (row) => {
        const user = row.user;
        if (!user?.friendly_name) return <span className="text-sm text-gray-400">—</span>;
        return (
          <div className="flex items-center gap-3">
            <UserAvatar name={user.friendly_name} src={user.avatar} size="sm" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {user.friendly_name}
              </p>
              <p className="text-xs text-gray-400">{user.userid}</p>
            </div>
          </div>
        );
      },
      skeletonRender: () => <SkeletonUserCell />,
    },
    {
      key: 'action',
      label: 'Action',
      width: '220px',
      render: (row) => (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${activityKeyColor(row.activity.key)}`}
        >
          {formatActivityKey(row.activity.key)}
        </span>
      ),
    },
    ...(scope === 'org'
      ? [
          {
            key: 'space',
            label: 'Space',
            width: '140px',
            render: () => (
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {selectedSpace?.name}
                </p>
                <p className="text-xs text-gray-400">#{activeSpaceId}</p>
              </div>
            ),
          } as Column<ActivityRow>,
        ]
      : []),
    {
      key: 'item',
      label: 'Item affected',
      render: (row) => {
        const name = resolveItemName(
          row.trackable as { name?: string } | null,
          row.activity.trackable_type,
        );
        return (
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{name}</p>
            {row.activity.trackable_id && (
              <p className="text-xs text-gray-400">#{row.activity.trackable_id}</p>
            )}
          </div>
        );
      },
    },
  ];

  function resetPage() {
    setPage(1);
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap mb-6">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Filter:</span>

        {scope === 'org' && (
          <SelectDropdown
            options={spaces.map((s) => ({ value: String(s.id), label: s.name }))}
            value={selectedSpaceId}
            onChange={(v) => {
              setSelectedSpaceId(v);
              resetPage();
            }}
            placeholder="Select Space:"
            className="w-52"
          />
        )}

        <CheckboxDropdown
          options={ACTIVITY_TYPES}
          value={activityKeys}
          onChange={(v) => {
            setActivityKeys(v);
            resetPage();
          }}
          placeholder="Select Activity type"
          className="w-52"
        />

        <CheckboxDropdown
          options={users.map((u) => ({
            value: String(u.id),
            label: `${u.firstname} ${u.lastname}`,
            avatarName: `${u.firstname} ${u.lastname}`,
            avatarSrc: u.avatar,
          }))}
          value={userIds}
          onChange={(v) => {
            setUserIds(v);
            resetPage();
          }}
          placeholder="Select User(s)"
          className="w-52"
        />

        <DateField
          value={dateFrom}
          onChange={(v) => {
            setDateFrom(v);
            resetPage();
          }}
          placeholder="From (YY-MM-DD)"
          className="w-44"
        />
        <DateField
          value={dateTo}
          onChange={(v) => {
            setDateTo(v);
            resetPage();
          }}
          placeholder="To (YY-MM-DD)"
          className="w-44"
        />
      </div>

      {/* Empty state (org scope with no space selected) */}
      {scope === 'org' && !activeSpaceId ? (
        <div className="flex-1 flex items-center justify-center pb-16">
          <div className="text-center">
            <div className="mx-auto size-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <svg
                className="size-10 text-gray-300 dark:text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Select a Space to view activities
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
              Use the filter above to select a space and view its activity log.
            </p>
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns as unknown as Column<Record<string, unknown>>[]}
          data={rows as unknown as Record<string, unknown>[]}
          keyField="id"
          isLoading={loading}
          pagination={{
            total,
            page,
            perPage,
            onPageChange: setPage,
            onPerPageChange: (n) => {
              setPerPage(n);
              setPage(1);
            },
            storageKey: perPageKey,
          }}
        />
      )}
    </div>
  );
}
