'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { X, RotateCcw, ChevronDown, ChevronUp, ArrowLeftRight, Eye, Columns2 } from 'lucide-react';
import { UserAvatar } from '@/components/ui/user-avatar';
import { PreviewFrame } from './preview-frame';
import { formatDateTime as formatDate } from '@/lib/date';
import { useApi } from '@/lib/swr';

interface StoryVersion {
  id: number;
  story_id: number;
  release_id: number | null;
  user_id: number | null;
  user: {
    id: number;
    name: string | null;
    email: string | null;
    avatar_url?: string | null;
  } | null;
  action: string;
  status: string;
  name: string;
  slug: string;
  full_slug: string;
  tag_list: string[];
  path: string | null;
  is_startpage: boolean;
  created_at: string;
}

interface CompareChange {
  path: string;
  old: any;
  new: any;
}

interface CompareResult {
  latest: StoryVersion | null;
  target: StoryVersion | null;
  changes: CompareChange[];
}

/** A group of consecutive versions by the same user */
interface VersionGroup {
  user: StoryVersion['user'];
  userId: number | null;
  versions: StoryVersion[];
  /** The most recent/prominent version in the group (first by date) */
  primary: StoryVersion;
}

interface Props {
  spaceId: string;
  storyId: number;
  storyName: string;
  storySlug?: string;
  previewUrl?: string;
  onClose: () => void;
  onRestore?: () => void;
}

type Tab = 'history' | 'visual' | 'compare';

function actionLabel(v: StoryVersion) {
  const who = v.user?.name ?? 'Unknown';
  if (v.action === 'publish') return `${who} Published ${v.name}`;
  if (v.action === 'unpublish') return `${who} Unpublished ${v.name}`;
  if (v.action === 'create') return `${who} Created ${v.name}`;
  return `${who} Saved ${v.name}`;
}

function actionVerb(action: string) {
  if (action === 'publish') return 'Published';
  if (action === 'unpublish') return 'Unpublished';
  if (action === 'create') return 'Created';
  return 'Edited';
}

/** Group consecutive versions by the same user */
function groupVersions(versions: StoryVersion[]): VersionGroup[] {
  const groups: VersionGroup[] = [];
  for (const v of versions) {
    const last = groups[groups.length - 1];
    if (last && last.userId === (v.user_id ?? null)) {
      last.versions.push(v);
    } else {
      groups.push({
        user: v.user,
        userId: v.user_id ?? null,
        versions: [v],
        primary: v,
      });
    }
  }
  return groups;
}

/** Parse a dot-notation path like "body.0.columns.1.title" into breadcrumb segments */
function parseBreadcrumb(path: string): string[] {
  return path.split('.').filter((seg) => !/^\d+$/.test(seg));
}

/** Render a value with appropriate formatting based on type */
function renderChangeValue(val: any): React.ReactNode {
  if (val === null || val === undefined) return <span className="text-gray-400 italic">empty</span>;
  if (typeof val === 'boolean') {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${val ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}
      >
        {val ? 'True' : 'False'}
      </span>
    );
  }
  if (typeof val === 'string') return <span className="break-all">{val}</span>;
  if (typeof val === 'number') return <span>{val}</span>;
  // Objects and arrays
  return (
    <pre className="text-xs font-mono bg-gray-50 dark:bg-gray-800 rounded p-2 overflow-x-auto max-h-48 whitespace-pre-wrap break-all">
      {JSON.stringify(val, null, 2)}
    </pre>
  );
}

export function StoryHistoryPanel({
  spaceId,
  storyId,
  storyName,
  storySlug,
  previewUrl,
  onClose,
  onRestore,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('history');
  const [selectedVersion, setSelectedVersion] = useState<StoryVersion | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  // Compare state
  const [compareLeft, setCompareLeft] = useState<StoryVersion | null>(null);
  const [compareRight, setCompareRight] = useState<StoryVersion | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const {
    data: versionsData,
    isLoading: loading,
    mutate: mutateVersions,
  } = useApi<{
    story_versions: StoryVersion[];
    total: number;
  }>(
    `/api/admin/spaces/${spaceId}/story_versions?by_story_id=${storyId}&by_release_id=0&per_page=50`,
  );

  const versions = versionsData?.story_versions ?? [];

  useEffect(() => {
    if (versions.length > 0 && !selectedVersion) {
      setSelectedVersion(versions[0]);
      setCompareLeft(versions[0]);
      if (versions.length > 1) setCompareRight(versions[1]);
    }
  }, [versions, selectedVersion]);

  async function handleRestore(v: StoryVersion) {
    if (!confirm(`Restore to version from ${formatDate(v.created_at)}?`)) return;
    setRestoring(true);
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/stories/${storyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story: { content: v.name, name: v.name } }),
      });
      if (res.ok) {
        await mutateVersions();
        onRestore?.();
        onClose();
      }
    } finally {
      setRestoring(false);
    }
  }

  async function runCompare() {
    if (!compareLeft || !compareRight) return;
    setCompareLoading(true);
    try {
      const res = await fetch(
        `/api/admin/spaces/${spaceId}/stories/${storyId}/compare?version_v2=${compareRight.id}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      setCompareResult(data);
    } finally {
      setCompareLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'compare' && compareLeft && compareRight) {
      runCompare();
    }
  }, [activeTab, compareLeft?.id, compareRight?.id, compareLeft, runCompare, compareRight]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = groupVersions(versions);

  function toggleGroup(groupIdx: number) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupIdx)) next.delete(groupIdx);
      else next.add(groupIdx);
      return next;
    });
  }

  // Build preview URL for a specific version
  const previewUrlForVersion =
    selectedVersion && previewUrl
      ? `${previewUrl}${previewUrl.includes('?') ? '&' : '?'}_storyblok_version=${selectedVersion.id}`
      : undefined;

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{storyName}</span>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body: main + sidebar */}
      <div className="flex flex-1 min-h-0">
        {/* Main area */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Tabs */}
          <div className="flex items-center gap-6 px-6 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            {(['history', 'visual', 'compare'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? 'border-green-600 text-green-700 dark:text-green-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab === 'visual' ? 'Visual' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {/* -- HISTORY TAB -- */}
            {activeTab === 'history' && (
              <div>
                {loading ? (
                  <HistorySkeleton />
                ) : versions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <RotateCcw className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm">No version history yet</p>
                  </div>
                ) : (
                  groups.map((group, gi) => {
                    const isExpanded = expandedGroups.has(gi);
                    const hasSubVersions = group.versions.length > 1;
                    const primary = group.primary;

                    return (
                      <div key={`g-${gi}`}>
                        {/* Primary version (always shown) */}
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
                            <p className="text-xs text-gray-400 mt-0.5">
                              at {formatDate(primary.created_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasSubVersions && (
                              <button
                                onClick={() => toggleGroup(gi)}
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
                              onClick={() => handleRestore(primary)}
                              disabled={restoring}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Restore
                            </button>
                          </div>
                        </div>
                        {/* Sub-versions (only when expanded) */}
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
                                onClick={() => handleRestore(v)}
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
                  })
                )}
              </div>
            )}

            {/* -- VISUAL TAB -- */}
            {activeTab === 'visual' && (
              <div className="flex flex-col h-full">
                {selectedVersion && (
                  <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                    <UserAvatar
                      name={selectedVersion.user?.name ?? '?'}
                      src={selectedVersion.user?.avatar_url ?? null}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {actionLabel(selectedVersion)}
                      </p>
                      <p className="text-xs text-gray-400">
                        at {formatDate(selectedVersion.created_at)}
                      </p>
                    </div>
                    {selectedVersion.id !== versions[0]?.id && (
                      <button
                        onClick={() => handleRestore(selectedVersion)}
                        disabled={restoring}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore
                      </button>
                    )}
                  </div>
                )}
                <PreviewFrame url={previewUrlForVersion} className="flex-1" />
              </div>
            )}

            {/* -- COMPARE TAB -- */}
            {activeTab === 'compare' && (
              <div className="flex flex-col h-full">
                {/* Version selectors */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                  <VersionSelect
                    versions={versions}
                    selected={compareLeft}
                    onSelect={setCompareLeft}
                    suffix="(Latest)"
                  />
                  <button
                    onClick={() => {
                      setCompareLeft(compareRight);
                      setCompareRight(compareLeft);
                    }}
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                  </button>
                  <VersionSelect
                    versions={versions}
                    selected={compareRight}
                    onSelect={setCompareRight}
                  />
                </div>

                {/* Diff content */}
                <div className="flex-1 overflow-y-auto">
                  {compareLoading ? (
                    <CompareSkeleton />
                  ) : !compareResult ? null : compareResult.changes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                      <ArrowLeftRight className="w-10 h-10 mb-3 opacity-30" />
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        No content changes
                      </p>
                      <p className="text-xs mt-1">
                        The selected versions have no content difference.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {/* Version headers */}
                      <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
                        <div className="px-6 py-4 flex items-center gap-3">
                          {compareResult.latest && (
                            <>
                              <UserAvatar
                                name={compareLeft?.user?.name ?? '?'}
                                src={compareLeft?.user?.avatar_url ?? null}
                                size="sm"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {compareLeft ? actionLabel(compareLeft) : ''}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {compareLeft ? `at ${formatDate(compareLeft.created_at)}` : ''}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="px-6 py-4 flex items-center gap-3">
                          {compareResult.target && (
                            <>
                              <UserAvatar
                                name={compareRight?.user?.name ?? '?'}
                                src={compareRight?.user?.avatar_url ?? null}
                                size="sm"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {compareRight ? actionLabel(compareRight) : ''}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {compareRight ? `at ${formatDate(compareRight.created_at)}` : ''}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Change rows — field-by-field */}
                      {compareResult.changes.map((change, i) => {
                        const breadcrumbs = parseBreadcrumb(change.path);
                        const fieldName = breadcrumbs[breadcrumbs.length - 1] ?? change.path;

                        return (
                          <div key={i}>
                            {/* Breadcrumb path */}
                            <div className="px-6 pt-4 pb-2">
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                {breadcrumbs.map((seg, si) => (
                                  <span key={si} className="flex items-center gap-1">
                                    {si > 0 && <ChevronDown className="w-3 h-3 -rotate-90" />}
                                    <span
                                      className={
                                        si === breadcrumbs.length - 1
                                          ? 'text-gray-600 dark:text-gray-300 font-medium'
                                          : ''
                                      }
                                    >
                                      {seg}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </div>
                            {/* Two-column diff */}
                            <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
                              <div className="px-6 pb-4">
                                <p className="text-xs font-medium text-gray-500 mb-1.5">
                                  {fieldName}{' '}
                                  <span className="text-gray-400 font-normal">
                                    (
                                    {typeof change.new === 'object' && change.new !== null
                                      ? Array.isArray(change.new)
                                        ? 'array'
                                        : 'object'
                                      : typeof change.new}
                                    )
                                  </span>
                                </p>
                                <div className="text-sm text-gray-900 dark:text-gray-100 rounded-md p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                                  {renderChangeValue(change.new)}
                                </div>
                              </div>
                              <div className="px-6 pb-4">
                                <p className="text-xs font-medium text-gray-500 mb-1.5">
                                  {fieldName}{' '}
                                  <span className="text-gray-400 font-normal">
                                    (
                                    {typeof change.old === 'object' && change.old !== null
                                      ? Array.isArray(change.old)
                                        ? 'array'
                                        : 'object'
                                      : typeof change.old}
                                    )
                                  </span>
                                </p>
                                <div className="text-sm text-gray-500 rounded-md p-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                                  {renderChangeValue(change.old)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Versions sidebar */}
        <div className="w-80 flex-shrink-0 border-l border-gray-200 dark:border-gray-800 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Versions</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <SidebarSkeleton />
            ) : (
              groups.map((group, gi) => {
                const isExpanded = expandedGroups.has(gi);
                const primary = group.primary;
                const hasSubVersions = group.versions.length > 1;

                return (
                  <div key={`sg-${gi}`}>
                    {/* Primary version card */}
                    <div
                      onClick={() => {
                        setSelectedVersion(primary);
                      }}
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
                              toggleGroup(gi);
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
                      {/* Hover action buttons */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity flex-shrink-0 mt-0.5 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                        {gi > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestore(primary);
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
                            setSelectedVersion(primary);
                            setActiveTab('visual');
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
                              setCompareRight(primary);
                              if (versions.length > 0) setCompareLeft(versions[0]);
                              setActiveTab('compare');
                            }}
                            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                            title="Compare with latest"
                          >
                            <Columns2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Sub-versions in sidebar */}
                    {isExpanded &&
                      hasSubVersions &&
                      group.versions.slice(1).map((v) => (
                        <div
                          key={v.id}
                          onClick={() => setSelectedVersion(v)}
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
                          {/* Hover action buttons */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover/subcard:opacity-100 transition-opacity flex-shrink-0 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestore(v);
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
                                setSelectedVersion(v);
                                setActiveTab('visual');
                              }}
                              className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                              title="Preview this version"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCompareRight(v);
                                if (versions.length > 0) setCompareLeft(versions[0]);
                                setActiveTab('compare');
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
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function VersionSelect({
  versions,
  selected,
  onSelect,
  suffix,
}: {
  versions: StoryVersion[];
  selected: StoryVersion | null;
  onSelect: (v: StoryVersion) => void;
  suffix?: string;
}) {
  return (
    <div className="relative flex-1">
      <select
        className="w-full appearance-none text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 pr-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        value={selected?.id ?? ''}
        onChange={(e) => {
          const v = versions.find((v) => v.id === parseInt(e.target.value, 10));
          if (v) onSelect(v);
        }}
      >
        {versions.map((v) => (
          <option key={v.id} value={v.id}>
            {formatDate(v.created_at)}
            {suffix && v.id === versions[0]?.id ? ` ${suffix}` : ''}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
}

function CompareSkeleton() {
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {/* Version headers skeleton */}
      <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
        {[0, 1].map((col) => (
          <div key={col} className="px-6 py-4 flex items-center gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
      {/* Change rows skeleton */}
      {[...Array(4)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="px-6 pt-4 pb-2">
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
          </div>
          <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
            {[0, 1].map((col) => (
              <div key={col} className="px-6 pb-4">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2" />
                <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function HistorySkeleton() {
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

function SidebarSkeleton() {
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
