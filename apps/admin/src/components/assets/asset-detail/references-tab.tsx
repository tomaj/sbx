'use client';

import { ExternalLink } from 'lucide-react';
import { formatDate } from '@/lib/date';

interface ReferencesTabProps {
  spaceId: string;
  referencesLoading: boolean;
  referencesTotal: number;
  referenceStories: any[];
}

export function ReferencesTab({
  spaceId,
  referencesLoading,
  referencesTotal,
  referenceStories,
}: ReferencesTabProps) {
  return (
    <div className="px-5 py-4">
      {referencesLoading ? (
        <div className="space-y-3 mt-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800"
            >
              <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Used in: {referencesTotal} {referencesTotal === 1 ? 'story' : 'stories'}
          </p>
          {referenceStories.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No stories reference this asset.</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {referenceStories.map((story) => (
                <div key={story.id} className="flex items-center gap-3 py-3">
                  <div className="w-5 h-5 rounded-full border-2 border-teal-500 flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-teal-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {story.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">/{story.full_slug}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-gray-400">
                      {story.updated_at ? formatDate(story.updated_at) : ''}
                    </p>
                  </div>
                  <a
                    href={`/spaces/${spaceId}/content/${story.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
