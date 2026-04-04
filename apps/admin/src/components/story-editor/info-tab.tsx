'use client';

import type { StoryDetail } from './types';
import { formatDate } from '@/lib/date';

function formatDistanceToNow(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 30)
    return `${Math.floor(days / 30)} month${Math.floor(days / 30) !== 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  return 'just now';
}

interface Props {
  story: StoryDetail;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-gray-100 dark:border-gray-800">
      <dt className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{label}</dt>
      <dd className="text-sm text-gray-600 dark:text-gray-400">{children}</dd>
    </div>
  );
}

function RelativeDate({ iso }: { iso: string | null }) {
  if (!iso) return <span>—</span>;
  const d = new Date(iso);
  return (
    <span title={d.toLocaleString()}>
      {formatDate(d)} <span className="text-gray-400">({formatDistanceToNow(d)})</span>
    </span>
  );
}

function StatusBadge({ story }: { story: StoryDetail }) {
  if (story.published && !story.unpublished_changes) {
    return (
      <span className="inline-flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
        <span className="w-2 h-2 rounded-full bg-teal-500" />
        Published
      </span>
    );
  }
  if (story.published && story.unpublished_changes) {
    return (
      <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        Published (unpublished changes)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-gray-500">
      <span className="w-2 h-2 rounded-full bg-gray-400" />
      Draft
    </span>
  );
}

export function InfoTab({ story }: Props) {
  return (
    <div className="p-4 overflow-y-auto">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Story Information
      </h3>
      <dl>
        <InfoRow label="Content type">
          {story.content_type ?? <span className="text-gray-400">—</span>}
        </InfoRow>
        <InfoRow label="Status">
          <div>
            <StatusBadge story={story} />
          </div>
          {story.published_at && (
            <div className="mt-0.5 text-xs text-gray-400">
              <RelativeDate iso={story.published_at} />
            </div>
          )}
        </InfoRow>
        <InfoRow label="Last modified">
          <RelativeDate iso={story.updated_at} />
        </InfoRow>
        <InfoRow label="Created">
          <RelativeDate iso={story.created_at} />
        </InfoRow>
        <InfoRow label="First published">
          <RelativeDate iso={story.first_published_at} />
        </InfoRow>
        <InfoRow label="Full slug">
          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
            {story.full_slug}
          </code>
        </InfoRow>
        <InfoRow label="UUID">
          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
            {story.uuid}
          </code>
        </InfoRow>
        <InfoRow label="ID">{story.id}</InfoRow>
        {story.tag_list.length > 0 && (
          <InfoRow label={`Tags · ${story.tag_list.length}`}>
            <div className="flex flex-wrap gap-1 mt-1">
              {story.tag_list.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </InfoRow>
        )}
        {story.tag_list.length === 0 && (
          <InfoRow label="Tags · 0">
            <span className="text-gray-400">None</span>
          </InfoRow>
        )}
        <InfoRow label="Workflow">
          <span className="text-gray-400">None</span>
        </InfoRow>
        <InfoRow label="Release">
          <span className="text-gray-400">None</span>
        </InfoRow>
      </dl>
    </div>
  );
}
