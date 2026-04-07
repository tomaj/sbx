'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { SkeletonAvatar, SkeletonText, SkeletonBlock } from '@/components/ui/skeleton';
import { useApi } from '@/lib/swr';
import {
  ActivityListItem,
  ApprovalListItem,
  MentionListItem,
  type ActivityRow,
  type MentionDiscussion,
  type ApprovalRow,
} from '@/components/dashboard/activity-list-item';

type ActivityTab = 'team' | 'my_edits' | 'assigned' | 'mentions';

const TABS: { key: ActivityTab; label: string }[] = [
  { key: 'team', label: 'Team' },
  { key: 'my_edits', label: 'My last edits' },
  { key: 'assigned', label: 'Assigned to me' },
  { key: 'mentions', label: 'My Mentions' },
];

const PER_PAGE = 10;

function SimplePagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div className="flex items-center justify-center gap-1 py-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="size-4 text-gray-500" />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
            p === page
              ? 'bg-teal-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="size-4 text-gray-500" />
      </button>
    </div>
  );
}

export interface ActivityCardRef {
  lastActivity: ActivityRow | undefined;
}

interface ActivityCardProps {
  spaceId: string;
  onLastActivityChange?: (activity: ActivityRow | undefined) => void;
}

export function ActivityCard({ spaceId, onLastActivityChange }: ActivityCardProps) {
  const { data: me } = useApi<{
    user: { id: number; email: string; firstname?: string; lastname?: string };
  }>('/api/admin/user/me');
  const currentUserId = me?.user?.id ?? null;

  const [activities, setActivities] = useState<ActivityRow[] | null>(null);
  const [activitiesTotal, setActivitiesTotal] = useState(0);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [tab, setTab] = useState<ActivityTab>('team');
  const [mentionDiscussions, setMentionDiscussions] = useState<MentionDiscussion[] | null>(null);
  const [mentionTotal, setMentionTotal] = useState(0);
  const [approvalRows, setApprovalRows] = useState<ApprovalRow[] | null>(null);

  const fetchActivities = useCallback(async () => {
    if (tab !== 'team' && tab !== 'my_edits') return;
    if (tab === 'my_edits' && !currentUserId) {
      setActivitiesLoading(false);
      return;
    }
    setActivitiesLoading(true);
    const p = new URLSearchParams({
      spaceId,
      per_page: String(PER_PAGE),
      page: String(activitiesPage),
    });
    if (tab === 'my_edits') p.set('user_ids', String(currentUserId));
    const res = await fetch(`/api/admin/activities?${p}`);
    if (res.ok) {
      const d = await res.json();
      setActivities(d.activities ?? []);
      setActivitiesTotal(d.total ?? 0);
    }
    setActivitiesLoading(false);
  }, [spaceId, tab, activitiesPage, currentUserId]);

  const fetchMentions = useCallback(async () => {
    if (tab !== 'mentions') return;
    setActivitiesLoading(true);
    const p = new URLSearchParams({ page: String(activitiesPage), per_page: String(PER_PAGE) });
    const res = await fetch(`/api/admin/spaces/${spaceId}/mentioned_discussions/me?${p}`);
    if (res.ok) {
      const d = await res.json();
      setMentionDiscussions(d.discussions ?? []);
      setMentionTotal((d.discussions ?? []).length);
    }
    setActivitiesLoading(false);
  }, [spaceId, tab, activitiesPage]);

  const fetchApprovals = useCallback(async () => {
    if (tab !== 'assigned') return;
    if (!currentUserId) {
      setActivitiesLoading(false);
      return;
    }
    setActivitiesLoading(true);
    const p = new URLSearchParams({ approver: String(currentUserId), with_story: 'true' });
    const res = await fetch(`/api/admin/spaces/${spaceId}/approvals?${p}`);
    if (res.ok) {
      const d = await res.json();
      setApprovalRows(d.approvals ?? []);
    }
    setActivitiesLoading(false);
  }, [spaceId, tab, currentUserId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);
  useEffect(() => {
    fetchMentions();
  }, [fetchMentions]);
  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  useEffect(() => {
    onLastActivityChange?.(activities?.[0]);
  }, [activities, onLastActivityChange]);

  function handleTabChange(t: ActivityTab) {
    setTab(t);
    setActivitiesPage(1);
    setActivities(null);
    setMentionDiscussions(null);
    setApprovalRows(null);
    setActivitiesLoading(true);
  }

  const totalItems = tab === 'mentions' ? mentionTotal : activitiesTotal;
  const totalPages = Math.max(1, Math.ceil(totalItems / PER_PAGE));

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
      <div className="flex items-center justify-between px-6 pt-5 pb-0">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Activity</h2>
        <Link
          href={`/spaces/${spaceId}/activities`}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          View Activities
          <ChevronRight className="size-4" />
        </Link>
      </div>

      <div className="flex items-center gap-1 px-6 mt-4 border-b border-gray-100 dark:border-gray-700">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              tab === key
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {activitiesLoading ? (
          Array.from({ length: PER_PAGE }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <SkeletonBlock className="size-5 rounded shrink-0" />
              <SkeletonAvatar />
              <div className="flex-1 space-y-1.5">
                <SkeletonText className="w-56 h-3.5" />
                <SkeletonText className="w-20 h-3" />
              </div>
              <SkeletonText className="w-24 h-3" />
            </div>
          ))
        ) : tab === 'assigned' ? (
          approvalRows === null || approvalRows.length === 0 ? (
            <p className="px-6 py-10 text-sm text-gray-400 text-center">No pending approvals.</p>
          ) : (
            approvalRows.map((row) => <ApprovalListItem key={row.id} row={row} spaceId={spaceId} />)
          )
        ) : tab === 'mentions' ? (
          mentionDiscussions === null || mentionDiscussions.length === 0 ? (
            <p className="px-6 py-10 text-sm text-gray-400 text-center">No mentions yet.</p>
          ) : (
            mentionDiscussions.map((disc) => (
              <MentionListItem key={disc.id} disc={disc} spaceId={spaceId} />
            ))
          )
        ) : activities === null || activities.length === 0 ? (
          <p className="px-6 py-10 text-sm text-gray-400 text-center">No activity yet.</p>
        ) : (
          activities.map((row) => <ActivityListItem key={row.id} row={row} spaceId={spaceId} />)
        )}
      </div>

      {totalPages > 1 && tab !== 'assigned' && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          <SimplePagination
            page={activitiesPage}
            totalPages={totalPages}
            onPageChange={(p) => setActivitiesPage(p)}
          />
        </div>
      )}
    </div>
  );
}
