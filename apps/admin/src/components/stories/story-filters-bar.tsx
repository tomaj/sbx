'use client';

import { useEffect } from 'react';
import { Star, ChevronRight } from 'lucide-react';
import {
  SearchFilterBar,
  type ActiveFilter,
  type SortOption,
  type FilterField,
} from '@/components/ui/search-filter-bar';
import { useApi } from '@/lib/swr';

export const STORY_SORT_OPTIONS: SortOption[] = [
  { value: 'position_asc', label: 'Default' },
  { value: 'created_at_asc', label: 'Creation Date (asc)' },
  { value: 'created_at_desc', label: 'Creation Date (desc)' },
  { value: 'first_published_at_asc', label: 'First Published Date (asc)' },
  { value: 'first_published_at_desc', label: 'First Published Date (desc)' },
  { value: 'published_at_asc', label: 'Published Date (asc)' },
  { value: 'published_at_desc', label: 'Published Date (desc)' },
  { value: 'updated_at_desc', label: 'Updated (newest)' },
  { value: 'updated_at_asc', label: 'Updated (oldest)' },
];

const PUBLISHED_FILTER: FilterField = {
  key: 'published',
  label: 'Published',
  type: 'select',
  options: [
    { value: 'true', label: 'Published' },
    { value: 'false', label: 'Unpublished / Draft' },
  ],
};

export type BreadcrumbEntry = { id: number; name: string };

interface StoryFiltersBarProps {
  spaceId: string;
  search: string;
  onSearchChange: (v: string) => void;
  sort: string;
  onSortChange: (v: string) => void;
  activeFilters: ActiveFilter[];
  onFiltersChange: (f: ActiveFilter[]) => void;
  showFavoritesOnly: boolean;
  onShowFavoritesOnlyChange: (v: boolean) => void;
  activeReleaseId: number | null;
  activeReleaseName: string | null;
  activeBranchName: string | null;
  breadcrumb: BreadcrumbEntry[];
  onNavigateBreadcrumb: (index: number) => void;
}

export function StoryFiltersBar({
  spaceId,
  search,
  onSearchChange,
  sort,
  onSortChange,
  activeFilters,
  onFiltersChange,
  showFavoritesOnly,
  onShowFavoritesOnlyChange,
  activeReleaseId,
  activeReleaseName,
  activeBranchName,
  breadcrumb,
  onNavigateBreadcrumb,
}: StoryFiltersBarProps) {
  const { data: filterOptionsData } = useApi<{
    content_types: string[];
    tags: string[];
    blocks: { value: string; label: string }[];
  }>(`/api/admin/spaces/${spaceId}/stories/filter-options`);

  const filterFields: FilterField[] = filterOptionsData
    ? [
        {
          key: 'content_type',
          label: 'Content Type',
          type: 'select',
          options: filterOptionsData.content_types.map((v) => ({ value: v, label: v })),
        },
        {
          key: 'tag',
          label: 'Tag',
          type: 'select',
          options: filterOptionsData.tags.map((v) => ({ value: v, label: v })),
        },
        {
          key: 'block',
          label: 'Blocks',
          type: 'select',
          options: filterOptionsData.blocks,
        },
        PUBLISHED_FILTER,
      ]
    : [PUBLISHED_FILTER];

  // Backfill options into already-active filters once options load
  useEffect(() => {
    if (!filterOptionsData) return;
    onFiltersChange(
      activeFilters.map((af) => {
        const def = filterFields.find((f) => f.key === af.key);
        return def ? { ...af, options: def.options } : af;
      }),
    );
    // Only run when options first load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOptionsData]);

  const searchPlaceholder = showFavoritesOnly
    ? 'Search favorites...'
    : activeReleaseName
      ? `Search in ${activeBranchName ?? 'Live'}...`
      : breadcrumb.length > 0
        ? `Search in ${breadcrumb[breadcrumb.length - 1].name}...`
        : 'Search stories...';

  return (
    <>
      {/* Toolbar */}
      <div className="px-8 pt-4 pb-3">
        <SearchFilterBar
          searchPlaceholder={searchPlaceholder}
          search={search}
          onSearchChange={onSearchChange}
          sortOptions={STORY_SORT_OPTIONS}
          sort={sort}
          onSortChange={onSortChange}
          filterFields={filterFields}
          activeFilters={activeFilters}
          onFiltersChange={onFiltersChange}
        />
      </div>

      {/* Favorites filter */}
      <div className="px-8 pb-2">
        <button
          onClick={() => onShowFavoritesOnlyChange(!showFavoritesOnly)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
            showFavoritesOnly
              ? 'border-yellow-400 text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-400/10'
              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <Star
            className={`size-3.5 ${showFavoritesOnly ? 'fill-yellow-400 text-yellow-400' : ''}`}
          />
          Favorites
        </button>
      </div>

      {/* Breadcrumb — only in current view, not in favorites/release-content mode */}
      {activeReleaseId === null && !showFavoritesOnly && breadcrumb.length > 0 && (
        <div className="px-8 pb-3 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          <button
            onClick={() => onNavigateBreadcrumb(-1)}
            className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            Root
          </button>
          {breadcrumb.map((entry, i) => (
            <span key={entry.id} className="flex items-center gap-1">
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
              {i < breadcrumb.length - 1 ? (
                <button
                  onClick={() => onNavigateBreadcrumb(i)}
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
    </>
  );
}
