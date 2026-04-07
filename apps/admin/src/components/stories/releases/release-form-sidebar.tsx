'use client';

import { AlertTriangle, Rocket } from 'lucide-react';
import { RightSidebar } from '@/components/ui/right-sidebar';
import type { Release } from './types';

interface ReleaseFormSidebarProps {
  open: boolean;
  onClose: () => void;
  editingRelease: Release | null;
  releaseName: string;
  onReleaseNameChange: (value: string) => void;
  releaseAt: string;
  onReleaseAtChange: (value: string) => void;
  saving: boolean;
  conflictInfo: { has_conflicts: boolean; conflicting_story_ids: number[] } | null;
  onSave: () => void;
  onDelete: () => void;
  onPublish: () => void;
}

export function ReleaseFormSidebar({
  open,
  onClose,
  editingRelease,
  releaseName,
  onReleaseNameChange,
  releaseAt,
  onReleaseAtChange,
  saving,
  conflictInfo,
  onSave,
  onDelete,
  onPublish,
}: ReleaseFormSidebarProps) {
  return (
    <RightSidebar
      open={open}
      onClose={onClose}
      header={
        <div>
          <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {editingRelease ? 'Edit Release' : 'New Release'}
          </div>
          {editingRelease && (
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {editingRelease.name}
            </div>
          )}
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-2">
            {editingRelease && (
              <button
                onClick={onDelete}
                className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Delete
              </button>
            )}
            {editingRelease && !editingRelease.released && (
              <button
                onClick={onPublish}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
              >
                <Rocket className="w-3.5 h-3.5" /> Publish release
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving || !releaseName.trim()}
              className="px-4 py-1.5 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving\u2026' : 'Save'}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name
          </label>
          <input
            type="text"
            value={releaseName}
            onChange={(e) => onReleaseNameChange(e.target.value)}
            placeholder="Release name"
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Scheduled publish <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="datetime-local"
            value={releaseAt}
            onChange={(e) => onReleaseAtChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {conflictInfo?.has_conflicts && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700 dark:text-amber-300">
              <strong>Conflicts detected.</strong> {conflictInfo.conflicting_story_ids.length} stor
              {conflictInfo.conflicting_story_ids.length === 1 ? 'y' : 'ies'} in this release also
              appear in other releases.
            </div>
          </div>
        )}
        {conflictInfo && !conflictInfo.has_conflicts && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
            <div className="text-sm text-green-700 dark:text-green-300">No conflicts detected.</div>
          </div>
        )}
      </div>
    </RightSidebar>
  );
}
