import { UserAvatar } from '@/components/ui/user-avatar';
import { SkeletonAvatar, SkeletonText, SkeletonLines } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/date';

export interface CommentData {
  id: number;
  uuid: string;
  discussion_id: number;
  user_id: number | null;
  user_name: string | null;
  user_avatar: string | null;
  message: string | null;
  created_at: string;
}

export function formatRelativeTime(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'a few seconds ago';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d ago`;
  return formatDate(d);
}

function renderMessageWithMentions(message: string) {
  const parts = message.split(/(@\S+)/);
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="text-teal-600 dark:text-teal-400 font-medium">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function CommentRow({ comment, onDelete }: { comment: CommentData; onDelete: () => void }) {
  return (
    <div className="flex gap-3 group">
      <UserAvatar
        name={comment.user_name}
        src={comment.user_avatar}
        size="sm"
        className="shrink-0 mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {comment.user_name || 'Unknown'}
          </span>
          <span className="text-xs text-gray-400 ml-2 shrink-0">
            {formatRelativeTime(comment.created_at)}
          </span>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
          {comment.message ? renderMessageWithMentions(comment.message) : null}
        </p>
        <div className="flex items-center gap-3 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onDelete}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function CommentsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <div key={i} className="flex gap-3">
          <SkeletonAvatar size="size-7" className="mt-0.5" />
          <div className="flex-1 space-y-2">
            <SkeletonText width="w-28" height="h-3" />
            <SkeletonLines lines={2} widths={['w-full', 'w-3/4']} height="h-3.5" />
          </div>
        </div>
      ))}
    </div>
  );
}
