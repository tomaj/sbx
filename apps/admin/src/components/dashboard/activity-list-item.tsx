import Link from 'next/link';
import {
  Pencil,
  Plus,
  Trash2,
  Upload,
  Download,
  CloudUpload,
  MessageSquare,
  CheckSquare,
} from 'lucide-react';
import { UserAvatar } from '@/components/ui/user-avatar';
import { formatActivityKey, resolveItemName } from '@/components/activities/activity-utils';

interface ActivityRow {
  id: number;
  activity: {
    id: number;
    key: string;
    trackable_id: number | null;
    trackable_type: string | null;
    created_at: string;
  };
  trackable: { id: string | number; name: string; slug: string } | null;
  user: {
    id: number;
    userid: string;
    friendly_name: string;
    avatar: string | null;
  } | null;
}

interface MentionDiscussion {
  id: number;
  uuid: string;
  title: string | null;
  fieldname: string | null;
  field_key: string | null;
  story_id: number | null;
  solved_at: string | null;
  created_at: string;
  last_comment: {
    id: number;
    message: string | null;
    message_json: any[];
    user_id: number | null;
    uuid: string;
    created_at: string;
    updated_at: string;
  } | null;
}

interface ApprovalRow {
  id: number;
  story_id: number;
  approver_id: number;
  status: string;
  story_name: string | null;
  story_full_slug: string | null;
  created_at: string;
}

export type { ActivityRow, MentionDiscussion, ApprovalRow };

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'a few seconds ago';
  const mins = Math.floor(secs / 60);
  if (mins === 1) return 'a minute ago';
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return 'an hour ago';
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

function ActivityIcon({ activityKey }: { activityKey: string }) {
  const verb = activityKey.slice(activityKey.lastIndexOf('.') + 1);
  const iconClass = 'size-4 text-gray-400';
  switch (verb) {
    case 'create':
      return <Plus className={iconClass} />;
    case 'update':
      return <Pencil className={iconClass} />;
    case 'delete':
      return <Trash2 className={iconClass} />;
    case 'publish':
      return <Upload className={iconClass} />;
    case 'unpublish':
      return <Download className={iconClass} />;
    case 'deploy':
      return <CloudUpload className={iconClass} />;
    default:
      return <Pencil className={iconClass} />;
  }
}

export function ActivityListItem({ row, spaceId }: { row: ActivityRow; spaceId: string }) {
  const userName = row.user?.friendly_name ?? 'Unknown';
  const itemName = resolveItemName(
    row.trackable as { name?: string } | null,
    row.activity.trackable_type,
  );
  return (
    <div key={row.id} className="flex items-center gap-4 px-6 py-3.5">
      <div className="size-8 flex items-center justify-center shrink-0">
        <ActivityIcon activityKey={row.activity.key} />
      </div>
      <UserAvatar name={userName} src={row.user?.avatar} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
          {userName}{' '}
          <span className="font-normal text-gray-600 dark:text-gray-400">
            {formatActivityKey(row.activity.key).toLowerCase()}
          </span>
        </p>
        {row.activity.trackable_id && (
          <p className="text-xs text-gray-400 truncate mt-0.5">
            {itemName && `${itemName} · `}#{row.activity.trackable_id}
          </p>
        )}
      </div>
      <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
        {timeAgo(row.activity.created_at)}
      </span>
    </div>
  );
}

export function ApprovalListItem({ row, spaceId }: { row: ApprovalRow; spaceId: string }) {
  return (
    <div key={row.id} className="flex items-center gap-4 px-6 py-3.5">
      <div className="size-8 flex items-center justify-center shrink-0">
        <CheckSquare className="size-4 text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
          Approval requested
        </p>
        {row.story_name ? (
          <Link
            href={`/spaces/${spaceId}/content/${row.story_id}`}
            className="text-xs text-teal-600 dark:text-teal-400 hover:underline truncate mt-0.5 block"
          >
            {row.story_name}
          </Link>
        ) : (
          <p className="text-xs text-gray-400 truncate mt-0.5">Story #{row.story_id}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium capitalize">
          {row.status}
        </span>
        <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(row.created_at)}</span>
      </div>
    </div>
  );
}

export function MentionListItem({ disc, spaceId }: { disc: MentionDiscussion; spaceId: string }) {
  return (
    <div key={disc.id} className="flex items-start gap-4 px-6 py-3.5">
      <div className="size-8 flex items-center justify-center shrink-0 mt-0.5">
        <MessageSquare className="size-4 text-teal-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
          {disc.title ?? disc.fieldname ?? 'Discussion'}
        </p>
        {disc.last_comment && (
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5 italic">
            {disc.last_comment.message}
          </p>
        )}
        {disc.story_id && (
          <Link
            href={`/spaces/${spaceId}/content/${disc.story_id}`}
            className="text-xs text-teal-600 dark:text-teal-400 hover:underline mt-0.5 block truncate"
          >
            Story #{disc.story_id}
            {disc.fieldname ? ` · ${disc.fieldname}` : ''}
          </Link>
        )}
      </div>
      <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
        {timeAgo(disc.last_comment?.created_at ?? disc.created_at)}
      </span>
    </div>
  );
}
