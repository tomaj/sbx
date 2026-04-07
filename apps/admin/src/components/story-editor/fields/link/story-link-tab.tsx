'use client';

import { useState, useRef, useEffect } from 'react';
import { useApi } from '@/lib/swr';
import {
  ChevronDown,
  ChevronRight,
  Search,
  Folder,
  ExternalLink,
  X,
  TriangleAlert,
  Lock,
} from 'lucide-react';
import type {
  LinkFieldDef,
  MultilinkFieldDef,
} from '@/components/block-library/edit-block-modal/types';
import { StoryStatusIcon } from '@/components/stories/story-status-icon';
import type { LinkValue, StoryItem, BreadcrumbEntry } from './types';

interface Props {
  value: LinkValue | undefined;
  def: LinkFieldDef | MultilinkFieldDef;
  spaceId: string;
  displayUrl: string;
  selectedStoryName: string;
  selectedStoryPublished: boolean | null;
  selectedStoryId: number | null;
  storyPanelOpen: boolean;
  onStoryPanelToggle: () => void;
  onStorySelect: (story: StoryItem) => void;
  onClearStory: () => void;
}

export function StoryLinkInline({
  value,
  spaceId,
  displayUrl,
  selectedStoryName,
  selectedStoryPublished,
  selectedStoryId,
  onStoryPanelToggle,
  onClearStory,
}: Props) {
  const selectedStorySlug = displayUrl;
  const storyIsUnpublished = selectedStorySlug && selectedStoryPublished === false;

  return (
    <div className="flex-1 flex items-center min-w-0">
      {storyIsUnpublished && (
        <TriangleAlert className="w-4 h-4 text-amber-500 flex-shrink-0 ml-3" />
      )}

      <button
        type="button"
        onClick={onStoryPanelToggle}
        className="flex-1 px-3 py-1.5 text-sm text-left min-w-0"
      >
        {selectedStorySlug ? (
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
              {selectedStoryName || selectedStorySlug.split('/').pop()}
            </p>
            <p className="text-xs text-gray-400 truncate leading-tight mt-0.5">
              {selectedStorySlug}
            </p>
          </div>
        ) : (
          <span className="text-gray-400">Internal link</span>
        )}
      </button>

      {selectedStorySlug ? (
        <div className="flex items-center flex-shrink-0 opacity-0 group-hover/input:opacity-100 transition-opacity border-l border-gray-200 dark:border-gray-700">
          <a
            href={selectedStoryId ? `/spaces/${spaceId}/content/${selectedStoryId}` : '#'}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Open story"
            className="flex items-center justify-center w-9 h-full text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            type="button"
            onClick={onClearStory}
            title="Clear selection"
            className="flex items-center justify-center w-9 h-full text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors border-l border-gray-200 dark:border-gray-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onStoryPanelToggle}
            title="Change selection"
            className="flex items-center justify-center w-9 h-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors border-l border-gray-200 dark:border-gray-700"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onStoryPanelToggle}
          className="flex items-center justify-center w-9 h-full flex-shrink-0 text-gray-400"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function StoryLinkWarning({
  displayUrl,
  selectedStoryPublished,
}: {
  displayUrl: string;
  selectedStoryPublished: boolean | null;
}) {
  const storyIsUnpublished = displayUrl && selectedStoryPublished === false;
  if (!storyIsUnpublished) return null;

  return (
    <div className="mt-1.5 flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-400/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-500/40">
      <TriangleAlert className="w-4 h-4 text-amber-500 flex-shrink-0" />
      <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
        Unpublished linked story
      </span>
    </div>
  );
}

export function StoryLinkPanel({
  value,
  def,
  spaceId,
  storyPanelOpen,
  onStoryPanelToggle,
  onStorySelect,
}: Pick<
  Props,
  'value' | 'def' | 'spaceId' | 'storyPanelOpen' | 'onStoryPanelToggle' | 'onStorySelect'
>) {
  const [storySearch, setStorySearch] = useState('');
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbEntry[]>([]);
  const currentParentId = breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].id : null;
  const storyPanelRef = useRef<HTMLDivElement>(null);

  // enable_advanced_search: when false, hide the search input (default: true)
  const showSearch = (def as any).enable_advanced_search !== false;
  // force_link_scope: lock breadcrumb navigation within the scope
  const forcedScope = (def as any).force_link_scope && def.link_scope ? def.link_scope : null;

  const storiesUrl = (() => {
    if (!storyPanelOpen) return null;
    const params = new URLSearchParams({ per_page: '50' });
    if (showSearch && storySearch.trim()) {
      params.set('text_search', storySearch.trim());
    } else {
      params.set('parent_id', currentParentId !== null ? String(currentParentId) : '');
    }
    if (def.restrict_content_types && def.component_whitelist?.length) {
      params.set('content_type', def.component_whitelist[0]);
    }
    if (def.link_scope) {
      params.set('starts_with', def.link_scope);
    }
    return `/api/admin/spaces/${spaceId}/stories?${params}`;
  })();
  const { data: storiesData, isLoading: storiesLoading } = useApi<{ stories: StoryItem[] }>(
    storiesUrl,
  );
  const stories = storiesData?.stories ?? [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (storyPanelRef.current && !storyPanelRef.current.contains(e.target as Node)) {
        onStoryPanelToggle();
      }
    }
    if (storyPanelOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [storyPanelOpen, onStoryPanelToggle]);

  function handleStoryClick(story: StoryItem) {
    if (story.is_folder) {
      setBreadcrumb((prev) => [...prev, { id: story.id, name: story.name }]);
      setStorySearch('');
    } else {
      onStorySelect(story);
      setBreadcrumb([]);
      setStorySearch('');
    }
  }

  function navigateBreadcrumb(index: number) {
    if (index < 0) {
      setBreadcrumb([]);
    } else {
      setBreadcrumb((prev) => prev.slice(0, index + 1));
    }
    setStorySearch('');
  }

  if (!storyPanelOpen) return null;

  return (
    <div
      ref={storyPanelRef}
      className="mt-1 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 shadow-lg overflow-hidden"
    >
      {showSearch && (
        <div className="p-2 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500">
            <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={storySearch}
              onChange={(e) => setStorySearch(e.target.value)}
              placeholder="Search for content items"
              className="flex-1 text-sm bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Scope lock indicator */}
      {forcedScope && breadcrumb.length === 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-amber-600 dark:text-amber-400 border-b border-gray-100 dark:border-gray-800 bg-amber-50 dark:bg-amber-950/20">
          <Lock className="w-3 h-3 flex-shrink-0" />
          <span>
            Locked to: <span className="font-medium">{forcedScope}</span>
          </span>
        </div>
      )}

      {!storySearch && breadcrumb.length > 0 && (
        <div className="flex items-center gap-1 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 flex-wrap">
          {forcedScope ? (
            // When scope is forced, "Root" means the scope root, not global root
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Lock className="w-3 h-3" />
              <button
                type="button"
                onClick={() => navigateBreadcrumb(-1)}
                className="hover:underline"
              >
                {forcedScope}
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => navigateBreadcrumb(-1)}
              className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
            >
              Root
            </button>
          )}
          {breadcrumb.map((entry, i) => (
            <span key={entry.id} className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3 text-gray-300 dark:text-gray-600" />
              {i < breadcrumb.length - 1 ? (
                <button
                  type="button"
                  onClick={() => navigateBreadcrumb(i)}
                  className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                >
                  {entry.name}
                </button>
              ) : (
                <span className="text-gray-900 dark:text-gray-100 font-medium">{entry.name}</span>
              )}
            </span>
          ))}
        </div>
      )}

      <div className="max-h-56 overflow-y-auto">
        {storiesLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0"
            >
              <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/5" />
                <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-3/5" />
              </div>
            </div>
          ))}
        {!storiesLoading && stories.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-gray-400">No content items found</div>
        )}
        {!storiesLoading &&
          stories.map((story) => (
            <button
              key={story.id}
              type="button"
              onClick={() => handleStoryClick(story)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                value?.id === story.uuid ? 'bg-teal-50 dark:bg-teal-900/20' : ''
              }`}
            >
              {story.is_folder ? (
                <Folder className="w-4 h-4 text-gray-400 flex-shrink-0" />
              ) : (
                <StoryStatusIcon
                  published={story.published}
                  unpublishedChanges={story.unpublished_changes}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {story.name}
                </p>
                <p className="text-xs text-gray-400 truncate">{story.full_slug}</p>
              </div>
              {story.is_folder && <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />}
            </button>
          ))}
      </div>
    </div>
  );
}
