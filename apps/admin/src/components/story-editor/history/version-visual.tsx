'use client';

import { RotateCcw } from 'lucide-react';
import { UserAvatar } from '@/components/ui/user-avatar';
import { PreviewFrame } from '../preview-frame';
import { formatDateTime as formatDate } from '@/lib/date';
import { type StoryVersion, actionLabel } from './version-utils';

interface VersionVisualProps {
  selectedVersion: StoryVersion | null;
  versions: StoryVersion[];
  previewUrl: string | undefined;
  restoring: boolean;
  onRestore: (v: StoryVersion) => void;
}

export function VersionVisual({
  selectedVersion,
  versions,
  previewUrl,
  restoring,
  onRestore,
}: VersionVisualProps) {
  const previewUrlForVersion =
    selectedVersion && previewUrl
      ? `${previewUrl}${previewUrl.includes('?') ? '&' : '?'}_storyblok_version=${selectedVersion.id}`
      : undefined;

  return (
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
            <p className="text-xs text-gray-400">at {formatDate(selectedVersion.created_at)}</p>
          </div>
          {selectedVersion.id !== versions[0]?.id && (
            <button
              onClick={() => onRestore(selectedVersion)}
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
  );
}
