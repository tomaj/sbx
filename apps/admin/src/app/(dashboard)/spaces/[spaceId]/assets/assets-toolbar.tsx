'use client';

import { FolderPlus, Upload, LayoutGrid, List } from 'lucide-react';
import {
  SearchFilterBar,
  type ActiveFilter,
  type SortOption,
  type FilterField,
} from '@/components/ui/search-filter-bar';

const SORT_OPTIONS: SortOption[] = [
  { value: 'created_at_desc', label: 'Default' },
  { value: 'created_at_asc', label: 'Creation Date (asc)' },
  { value: 'created_at_desc', label: 'Creation Date (desc)' },
  { value: 'updated_at_asc', label: 'Update Date (asc)' },
  { value: 'updated_at_desc', label: 'Update Date (desc)' },
  { value: 'filename_asc', label: 'Name (asc)' },
  { value: 'filename_desc', label: 'Name (desc)' },
];

const FILTER_FIELDS: FilterField[] = [
  {
    key: 'content_type',
    label: 'Type',
    type: 'select',
    options: [
      { value: 'image/', label: 'Images' },
      { value: 'video/', label: 'Videos' },
      { value: 'audio/', label: 'Audio' },
      { value: 'application/pdf', label: 'PDF' },
      { value: 'application/json', label: 'JSON' },
    ],
  },
  { key: 'created_after', label: 'Created after', type: 'date' },
  { key: 'created_before', label: 'Created before', type: 'date' },
];

interface AssetsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sort: string;
  onSortChange: (value: string) => void;
  activeFilters: ActiveFilter[];
  onFiltersChange: (filters: ActiveFilter[]) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  isTagsView: boolean;
  onCreateFolder: () => void;
  onUpload: () => void;
}

export function AssetsToolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  activeFilters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  isTagsView,
  onCreateFolder,
  onUpload,
}: AssetsToolbarProps) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Assets</h1>
        {!isTagsView && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCreateFolder}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              Create Folder
            </button>
            <button
              type="button"
              onClick={onUpload}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload files
            </button>
          </div>
        )}
      </div>

      {/* Search / filter / sort + view toggle (only shown when not in tags view) */}
      {!isTagsView && (
        <div className="px-6 pt-4 pb-3 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <SearchFilterBar
                searchPlaceholder="Search assets..."
                search={search}
                onSearchChange={onSearchChange}
                sortOptions={SORT_OPTIONS}
                sort={sort}
                onSortChange={onSortChange}
                filterFields={FILTER_FIELDS}
                activeFilters={activeFilters}
                onFiltersChange={onFiltersChange}
              />
            </div>

            {/* View toggle */}
            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => onViewModeChange('grid')}
                className={`p-2 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('list')}
                className={`p-2 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
