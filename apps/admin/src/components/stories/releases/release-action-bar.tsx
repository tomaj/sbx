'use client';

import { CalendarDays, SquarePen, Trash2 } from 'lucide-react';
import { formatDateTime } from '@/lib/date';
import type { Release } from './types';

interface ReleaseActionBarProps {
  activeRelease: Release;
  showReleaseContentOnly: boolean;
  onShowReleaseContentOnlyChange: (value: boolean) => void;
  scheduleDateOpen: boolean;
  scheduleDate: string;
  onOpenScheduleDate: () => void;
  onScheduleDateChange: (value: string) => void;
  onCloseScheduleDate: () => void;
  onSaveScheduleDate: () => void;
  onEditRelease: () => void;
  onDeleteRelease: () => void;
  onPublishRelease: () => void;
}

export function ReleaseActionBar({
  activeRelease,
  showReleaseContentOnly,
  onShowReleaseContentOnlyChange,
  scheduleDateOpen,
  scheduleDate,
  onOpenScheduleDate,
  onScheduleDateChange,
  onCloseScheduleDate,
  onSaveScheduleDate,
  onEditRelease,
  onDeleteRelease,
  onPublishRelease,
}: ReleaseActionBarProps) {
  return (
    <div className="px-8 pt-3 pb-0">
      <div className="flex items-center justify-between px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800/50">
        <div className="flex items-center gap-1">
          <div className="relative">
            <button
              onClick={onOpenScheduleDate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <CalendarDays className="w-4 h-4" />
              {activeRelease.release_at
                ? formatDateTime(activeRelease.release_at)
                : 'Set scheduled date'}
            </button>
            {scheduleDateOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={onCloseScheduleDate} />
                <div className="absolute left-0 top-full mt-1 z-40 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Scheduled publish date
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => onScheduleDateChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 mb-3"
                  />
                  <div className="flex gap-2 justify-end">
                    {scheduleDate && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onScheduleDateChange('');
                        }}
                        className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseScheduleDate();
                      }}
                      className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSaveScheduleDate();
                      }}
                      className="px-3 py-1.5 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          <button
            onClick={onEditRelease}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
            title="Edit release"
          >
            <SquarePen className="w-4 h-4" />
          </button>
          <button
            onClick={onDeleteRelease}
            className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
            title="Delete release"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showReleaseContentOnly}
              onChange={(e) => onShowReleaseContentOnlyChange(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            Show release content only
          </label>
          <button
            onClick={onPublishRelease}
            className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            Publish now
          </button>
        </div>
      </div>
    </div>
  );
}
