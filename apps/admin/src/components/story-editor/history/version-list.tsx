'use client';

import { RotateCcw, ChevronDown, ChevronUp, Eye, Columns2 } from 'lucide-react';
import { UserAvatar } from '@/components/ui/user-avatar';
import { formatDateTime as formatDate } from '@/lib/date';
import { type StoryVersion, type VersionGroup, actionLabel, actionVerb } from './version-utils';

interface VersionListProps {
  groups: VersionGroup[];
  versions: StoryVersion[];
  loading: boolean;
  selectedVersion: StoryVersion | null;
  expandedGroups: Set<number>;
  restoring: boolean;
  onSelectVersion: (v: StoryVersion) => void;
  onToggleGroup: (idx: number) => void;
  onRestore: (v: StoryVersion) => void;
  onPreview: (v: StoryVersion) => void;
  onCompare: (v: StoryVersion) => void;
}

export function VersionList({
  groups,
  versions,
  loading,
  selectedVersion,
  expandedGroups,
  restoring,
  onSelectVersion,
  onToggleGroup,
  onRestore,
  onPreview,
  onCompare,
}: VersionListProps) {
  if (loading) return <HistorySkeleton />;

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <RotateCcw className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm">No version history yet</p>
      </div>
    );
  }

  return (
    <div>
      {groups.map((group, gi) => {
        const isExpanded = expandedGroups.has(gi);
        const hasSubVersions = group.versions.length > 1;
        const primary = group.primary;

        return (
          <div key={`g-${gi}`}>
            <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 dark:border-gray-800 group hover:bg-gray-50 dark:hover:bg-gray-900">
              <UserAvatar
                name={group.user?.name ?? '?'}
                src={group.user?.avatar_url ?? null}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {actionLabel(primary)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">at {formatDate(primary.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                {hasSubVersions && (
                  <button
                    onClick={() => onToggleGroup(gi)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                    {group.versions.length - 1} more
                  </button>
                )}
                <button
                  onClick={() => onRestore(primary)}
                  disabled={restoring}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restore
                </button>
              </div>
            </div>
            {isExpanded &&
              hasSubVersions &&
              group.versions.slice(1).map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-4 pl-16 pr-6 py-3 border-b border-gray-50 dark:border-gray-900 group hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <UserAvatar
                    name={group.user?.name ?? '?'}
                    src={group.user?.avatar_url ?? null}
                    size="xs"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">{formatDate(v.created_at)}</p>
                    <p className="text-xs text-gray-400">
                      {actionVerb(v.action)} by {v.user?.name ?? 'Unknown'}
                    </p>
                  </div>
                  <button
                    onClick={() => onRestore(v)}
                    disabled={restoring}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restore
                  </button>
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );
}

interface VersionSidebarProps {
  groups: VersionGroup[];
  versions: StoryVersion[];
  loading: boolean;
  selectedVersion: StoryVersion | null;
  expandedGroups: Set<number>;
  restoring: boolean;
  onSelectVersion: (v: StoryVersion) => void;
  onToggleGroup: (idx: number) => void;
  onRestore: (v: StoryVersion) => void;
  onPreview: (v: StoryVersion) => void;
  onCompare: (v: StoryVersion) => void;
}

export function VersionSidebar({
  groups,
  versions,
  loading,
  selectedVersion,
  expandedGroups,
  restoring,
  onSelectVersion,
  onToggleGroup,
  onRestore,
  onPreview,
  onCompare,
}: VersionSidebarProps) {
  if (loading) return <SidebarSkeleton />;

  return (
    <>
      {groups.map((group, gi) => {
        const isExpanded = expandedGroups.has(gi);
        const primary = group.primary;
        const hasSubVersions = group.versions.length > 1;

        return (
          <div key={`sg-${gi}`}>
            <div
              onClick={() => onSelectVersion(primary)}
              className={`group/card w-full flex items-start gap-2 px-3 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 text-left transition-colors cursor-pointer ${
                selectedVersion?.id === primary.id
                  ? 'bg-green-50 dark:bg-green-950 border-l-2 border-l-green-600'
                  : ''
              }`}
            >
              <div className="flex items-center gap-1 mt-0.5 flex-shrink-0">
                {hasSubVersions ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleGroup(gi);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                ) : (
                  <span className="w-3" />
                )}
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    primary.status === 'published' ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              </div>
              <UserAvatar
                name={group.user?.name ?? '?'}
                src={group.user?.avatar_url ?? null}
                size="xs"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate leading-tight">
                  {actionLabel(primary)}
                </p>
                <p className="text-xs text-gray-500 leading-tight">
                  {formatDate(primary.created_at)}
                </p>
                <p className="text-xs text-gray-400 leading-tight">
                  {actionVerb(primary.action)} by {primary.user?.name ?? 'Unknown'}
                </p>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity flex-shrink-0 mt-0.5 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                {gi > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestore(primary);
                    }}
                    disabled={restoring}
                    className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Restore this version"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview(primary);
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Preview this version"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                {gi > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCompare(primary);
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Compare with latest"
                  >
                    <Columns2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {isExpanded &&
              hasSubVersions &&
              group.versions.slice(1).map((v) => (
                <div
                  key={v.id}
                  onClick={() => onSelectVersion(v)}
                  className={`group/subcard w-full flex items-start gap-2 pl-8 pr-3 py-2.5 border-b border-gray-50 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-900 text-left transition-colors cursor-pointer ${
                    selectedVersion?.id === v.id
                      ? 'bg-green-50 dark:bg-green-950 border-l-2 border-l-green-600'
                      : ''
                  }`}
                >
                  <UserAvatar
                    name={group.user?.name ?? '?'}
                    src={group.user?.avatar_url ?? null}
                    size="xs"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500 leading-tight">
                      {formatDate(v.created_at)}
                    </p>
                    <p className="text-xs text-gray-400 leading-tight">
                      {actionVerb(v.action)} by {v.user?.name ?? 'Unknown'}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover/subcard:opacity-100 transition-opacity flex-shrink-0 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestore(v);
                      }}
                      disabled={restoring}
                      className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                      title="Restore this version"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreview(v);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                      title="Preview this version"
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCompare(v);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                      title="Compare with latest"
                    >
                      <Columns2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        );
      })}
    </>
  );
}

export function HistorySkeleton() {
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-start gap-2 px-3 py-3 animate-pulse">
          <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1.5" />
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
