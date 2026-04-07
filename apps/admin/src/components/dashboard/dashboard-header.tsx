'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Settings, Workflow, KeyRound } from 'lucide-react';
import { SkeletonBlock, SkeletonText } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/date';

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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'a few seconds ago';
  const mins = Math.floor(secs / 60);
  if (mins === 1) return 'a minute ago';
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return 'an hour ago';
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

const SPACE_ACTIONS = [
  { label: 'Settings', icon: Settings, href: 'settings/space' },
  { label: 'Workflows', icon: Workflow, href: 'settings/workflows' },
  { label: 'Access Tokens', icon: KeyRound, href: 'settings/access-tokens' },
];

function SpaceActionsDropdown({ spaceId }: { spaceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        Space actions
        <ChevronDown className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 py-1">
          {SPACE_ACTIONS.map(({ label, icon: Icon, href }) => (
            <button
              key={href}
              onClick={() => {
                router.push(`/spaces/${spaceId}/${href}`);
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <Icon className="size-4 text-gray-400" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface DashboardHeaderProps {
  spaceId: string;
  space: { id: number; name: string } | null;
  lastActivity: ActivityRow | undefined;
}

export function DashboardHeader({ spaceId, space, lastActivity }: DashboardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {space ? (
          <>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{space.name}</h1>
            {lastActivity && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Last updated by {lastActivity.user?.friendly_name ?? 'Unknown'}{' '}
                {timeAgo(lastActivity.activity.created_at)}
                {' · '}
                {formatDateTime(lastActivity.activity.created_at)}
              </p>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <SkeletonBlock className="h-8 w-40 rounded-lg" />
            <SkeletonText className="w-72" />
          </div>
        )}
      </div>
      <SpaceActionsDropdown spaceId={spaceId} />
    </div>
  );
}
