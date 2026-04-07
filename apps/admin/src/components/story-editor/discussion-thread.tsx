'use client';

import { MessageSquare, CheckCircle, RotateCcw, Send } from 'lucide-react';
import { CommentItem, type CommentData } from '@/components/ui/comment-item';

export interface Discussion {
  id: number;
  space_id: number;
  story_id: number | null;
  field_key: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  comments: CommentData[];
}

export interface DiscussionThreadProps {
  discussion: Discussion;
  resolved: boolean;
  replyValue: string;
  isReplying: boolean;
  submitting: boolean;
  onReplyChange: (val: string) => void;
  onReplyFocus: () => void;
  onReplyBlur: () => void;
  onReply: () => void;
  onResolve: () => void;
  onUnresolve: () => void;
  onDeleteComment: (commentId: number) => Promise<void>;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, submit: () => void) => void;
}

export function DiscussionThread({
  discussion,
  resolved,
  replyValue,
  isReplying,
  submitting,
  onReplyChange,
  onReplyFocus,
  onReplyBlur,
  onReply,
  onResolve,
  onUnresolve,
  onDeleteComment,
  onKeyDown,
}: DiscussionThreadProps) {
  return (
    <div className="mx-3 px-3 py-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
      {/* Field label badge */}
      {discussion.field_key && (
        <div className="mb-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
            <MessageSquare className="w-2.5 h-2.5" />
            {discussion.field_key}
          </span>
        </div>
      )}

      {/* Comments */}
      <div className="space-y-3">
        {discussion.comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} onDelete={onDeleteComment} canDelete />
        ))}
        {discussion.comments.length === 0 && (
          <p className="text-xs text-gray-400 italic">No comments yet.</p>
        )}
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2">
        {!resolved ? (
          <>
            <button
              type="button"
              onClick={onReplyFocus}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 font-medium transition-colors"
            >
              Reply
            </button>
            <span className="text-gray-200 dark:text-gray-700">·</span>
            <button
              type="button"
              onClick={onResolve}
              className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 font-medium transition-colors"
            >
              <CheckCircle className="w-3 h-3" />
              Resolve
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onUnresolve}
            className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 font-medium transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Re-open
          </button>
        )}
      </div>

      {/* Reply input */}
      {isReplying && (
        <div className="mt-3 relative">
          <textarea
            value={replyValue}
            onChange={(e) => onReplyChange(e.target.value)}
            onKeyDown={(e) => onKeyDown(e, onReply)}
            onBlur={onReplyBlur}
            placeholder="Write a comment and notify others with @ (⌘↵ to send)"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={onReply}
            disabled={!replyValue.trim() || submitting}
            className="absolute bottom-2 right-2 p-1.5 rounded-md bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Send (⌘↵)"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
