'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useApi } from '@/lib/swr';
import { formatDateTime as formatDate } from '@/lib/date';
import { type StoryVersion, type CompareResult, groupVersions } from './history/version-utils';
import { VersionList, VersionSidebar } from './history/version-list';
import { VersionCompare } from './history/version-compare';
import { VersionVisual } from './history/version-visual';

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

export function StoryHistoryPanel({
  spaceId,
  storyId,
  storyName,
  previewUrl,
  onClose,
  onRestore,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('history');
  const [selectedVersion, setSelectedVersion] = useState<StoryVersion | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  const [compareLeft, setCompareLeft] = useState<StoryVersion | null>(null);
  const [compareRight, setCompareRight] = useState<StoryVersion | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const {
    data: versionsData,
    isLoading: loading,
    mutate: mutateVersions,
  } = useApi<{ story_versions: StoryVersion[]; total: number }>(
    `/api/admin/spaces/${spaceId}/story_versions?by_story_id=${storyId}&by_release_id=0&per_page=50`,
  );

  const versions = versionsData?.story_versions ?? [];
  const groups = groupVersions(versions);

  useEffect(() => {
    if (versions.length > 0 && !selectedVersion) {
      setSelectedVersion(versions[0]);
      setCompareLeft(versions[0]);
      if (versions.length > 1) setCompareRight(versions[1]);
    }
  }, [versions, selectedVersion]);

  const runCompare = useCallback(async () => {
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
  }, [spaceId, storyId, compareLeft, compareRight]);

  useEffect(() => {
    if (activeTab === 'compare' && compareLeft && compareRight) {
      runCompare();
    }
  }, [activeTab, compareLeft?.id, compareRight?.id, compareRight, runCompare, compareLeft]); // eslint-disable-line react-hooks/exhaustive-deps

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

  function toggleGroup(groupIdx: number) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupIdx)) next.delete(groupIdx);
      else next.add(groupIdx);
      return next;
    });
  }

  const sharedListProps = {
    groups,
    versions,
    loading,
    selectedVersion,
    expandedGroups,
    restoring,
    onSelectVersion: setSelectedVersion,
    onToggleGroup: toggleGroup,
    onRestore: handleRestore,
    onPreview: (v: StoryVersion) => {
      setSelectedVersion(v);
      setActiveTab('visual');
    },
    onCompare: (v: StoryVersion) => {
      setCompareRight(v);
      if (versions.length > 0) setCompareLeft(versions[0]);
      setActiveTab('compare');
    },
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-950 flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{storyName}</span>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex flex-col flex-1 min-w-0">
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

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'history' && <VersionList {...sharedListProps} />}
            {activeTab === 'visual' && (
              <VersionVisual
                selectedVersion={selectedVersion}
                versions={versions}
                previewUrl={previewUrl}
                restoring={restoring}
                onRestore={handleRestore}
              />
            )}
            {activeTab === 'compare' && (
              <VersionCompare
                versions={versions}
                compareLeft={compareLeft}
                compareRight={compareRight}
                compareResult={compareResult}
                compareLoading={compareLoading}
                onSetLeft={setCompareLeft}
                onSetRight={setCompareRight}
                onSwap={() => {
                  setCompareLeft(compareRight);
                  setCompareRight(compareLeft);
                }}
              />
            )}
          </div>
        </div>

        <div className="w-80 flex-shrink-0 border-l border-gray-200 dark:border-gray-800 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Versions</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            <VersionSidebar {...sharedListProps} />
          </div>
        </div>
      </div>
    </div>
  );
}
