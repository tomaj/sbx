'use client';

import { Plus, ChevronDown, GitBranch, SquarePen, Search } from 'lucide-react';
import { SkeletonText } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/date';
import type { Release } from './types';

interface ReleaseDropdownProps {
  releases: Release[];
  unreleased: Release[];
  activeReleaseId: number | null;
  activeRelease: Release | null;
  releasesLoading: boolean;
  showReleasesDropdown: boolean;
  releaseSearch: string;
  onToggleDropdown: () => void;
  onCloseDropdown: () => void;
  onSearchChange: (value: string) => void;
  onSelectRelease: (id: number) => void;
  onEditRelease: (release: Release) => void;
  onCreateRelease: () => void;
}

export function ReleaseDropdown({
  unreleased,
  activeReleaseId,
  activeRelease,
  releasesLoading,
  showReleasesDropdown,
  releaseSearch,
  onToggleDropdown,
  onCloseDropdown,
  onSearchChange,
  onSelectRelease,
  onEditRelease,
  onCreateRelease,
}: ReleaseDropdownProps) {
  return (
    <div className="relative">
      <button
        onClick={onToggleDropdown}
        className={`flex items-center gap-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
          activeReleaseId !== null
            ? 'border-teal-600 text-teal-600 dark:text-teal-400'
            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
        }`}
      >
        {releasesLoading ? (
          <SkeletonText className="w-16 h-3" />
        ) : activeRelease ? (
          <span className="flex items-center gap-1">
            <GitBranch className="w-3.5 h-3.5" />
            {activeRelease.name}
          </span>
        ) : (
          <span>
            {unreleased.length} release{unreleased.length !== 1 ? 's' : ''}
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {showReleasesDropdown && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => {
              onCloseDropdown();
              onSearchChange('');
            }}
          />
          <div className="absolute left-0 top-full mt-1 z-40 w-[420px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl flex flex-col max-h-[420px]">
            <div className="p-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500 transition-colors">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={releaseSearch}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 outline-none"
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {!releaseSearch && (
                <div className="px-4 pt-3 pb-1">
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    {unreleased.length} release{unreleased.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {unreleased.length === 0 && !releasesLoading && (
                <div className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">
                  No active releases
                </div>
              )}

              {unreleased
                .filter(
                  (r) =>
                    !releaseSearch || r.name.toLowerCase().includes(releaseSearch.toLowerCase()),
                )
                .map((release) => {
                  const scheduleLabel = release.release_at
                    ? formatDateTime(release.release_at)
                    : 'Not scheduled';
                  return (
                    <button
                      key={release.id}
                      onClick={() => {
                        onSelectRelease(release.id);
                        onCloseDropdown();
                        onSearchChange('');
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        activeReleaseId === release.id ? 'bg-teal-50 dark:bg-teal-900/20' : ''
                      }`}
                    >
                      <div className="flex flex-col items-start min-w-0">
                        <span
                          className={`text-sm font-medium truncate ${activeReleaseId === release.id ? 'text-teal-700 dark:text-teal-300' : 'text-gray-800 dark:text-gray-200'}`}
                        >
                          {release.name}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {scheduleLabel}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditRelease(release);
                          onCloseDropdown();
                          onSearchChange('');
                        }}
                        className="ml-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
                        title="Edit release"
                      >
                        <SquarePen className="w-4 h-4" />
                      </button>
                    </button>
                  );
                })}
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700/50 shrink-0">
              <button
                onClick={() => {
                  onCloseDropdown();
                  onSearchChange('');
                  onCreateRelease();
                }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
              >
                <Plus className="w-4 h-4" /> New release
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
