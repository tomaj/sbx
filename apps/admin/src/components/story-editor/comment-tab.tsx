'use client';

import { useState } from 'react';
import { MessageSquare, CheckCircle, RotateCcw, Send } from 'lucide-react';
import { CommentItem, type CommentData } from '@/components/ui/comment-item';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';

interface Discussion {
  id: number;
  space_id: number;
  story_id: number | null;
  field_key: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  comments: CommentData[];
}

interface CommentTabProps {
  spaceId: string;
  storyId: number | null;
  onDiscussionChange?: () => void;
}

type TabType = 'open' | 'resolved';

export function CommentTab({ spaceId, storyId, onDiscussionChange }: CommentTabProps) {
  const [activeTab, setActiveTab] = useState<TabType>('open');
  const [replyMessages, setReplyMessages] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  const discussionsUrl = storyId
    ? `/api/admin/spaces/${spaceId}/discussions?story_id=${storyId}&by_status=${activeTab === 'resolved' ? 'solved' : 'unsolved'}`
    : null;

  const {
    data: discussionsData,
    isLoading: loading,
    mutate: mutateDiscussions,
  } = useSWR<Discussion[]>(
    discussionsUrl,
    async (url: string) => {
      const res = await fetcher(url);
      const discs: any[] = res.discussions ?? [];
      // Fetch comments for each discussion in parallel
      const withComments = await Promise.all(
        discs.map(async (d: any) => {
          try {
            const cData = await fetcher(
              `/api/admin/spaces/${spaceId}/discussions/${d.id}/comments`,
            );
            return { ...d, comments: cData.comments ?? [] };
          } catch {
            return { ...d, comments: [] };
          }
        }),
      );
      // Only show discussions that have comments (matching previous behavior)
      return withComments.filter((d: Discussion) => d.comments.length > 0);
    },
    { revalidateOnFocus: false },
  );

  const discussions = discussionsData ?? [];

  async function handleReply(discussionId: number) {
    const message = replyMessages[discussionId]?.trim();
    if (!message || submitting) return;
    setSubmitting(true);
    try {
      await fetch(`/api/admin/spaces/${spaceId}/discussions/${discussionId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: { message } }),
      });
      setReplyMessages((prev) => ({ ...prev, [discussionId]: '' }));
      setReplyingTo(null);
      await mutateDiscussions();
      onDiscussionChange?.();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResolve(discussionId: number) {
    await fetch(`/api/admin/spaces/${spaceId}/discussions/${discussionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discussion: { solved_at: new Date().toISOString() } }),
    });
    await mutateDiscussions();
    onDiscussionChange?.();
  }

  async function handleUnresolve(discussionId: number) {
    await fetch(`/api/admin/spaces/${spaceId}/discussions/${discussionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discussion: { solved_at: null } }),
    });
    await mutateDiscussions();
    onDiscussionChange?.();
  }

  async function handleDeleteComment(discussionId: number, commentId: number) {
    await fetch(`/api/admin/spaces/${spaceId}/discussions/${discussionId}/comments/${commentId}`, {
      method: 'DELETE',
    });
    await mutateDiscussions();
    onDiscussionChange?.();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, onSubmit: () => void) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Comments</h2>
      </div>
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 px-4 flex-shrink-0">
        {(['open', 'resolved'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab === 'open' ? 'Open' : 'Resolved'}
          </button>
        ))}
      </div>

      {/* Discussion list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <DiscussionsSkeleton />
        ) : discussions.length === 0 ? (
          <EmptyState resolved={activeTab === 'resolved'} />
        ) : (
          <div className="py-3 space-y-1">
            {discussions.map((disc) => (
              <DiscussionThread
                key={disc.id}
                discussion={disc}
                resolved={activeTab === 'resolved'}
                replyValue={replyMessages[disc.id] ?? ''}
                isReplying={replyingTo === disc.id}
                submitting={submitting}
                onReplyChange={(val) => setReplyMessages((prev) => ({ ...prev, [disc.id]: val }))}
                onReplyFocus={() => setReplyingTo(disc.id)}
                onReplyBlur={() => {
                  if (!replyMessages[disc.id]?.trim()) setReplyingTo(null);
                }}
                onReply={() => handleReply(disc.id)}
                onResolve={() => handleResolve(disc.id)}
                onUnresolve={() => handleUnresolve(disc.id)}
                onDeleteComment={(commentId) => handleDeleteComment(disc.id, commentId)}
                onKeyDown={handleKeyDown}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface DiscussionThreadProps {
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

function DiscussionThread({
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

function EmptyState({ resolved }: { resolved: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <MessageSquare className="w-5 h-5 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {resolved ? 'No resolved discussions' : 'No open discussions'}
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        {resolved
          ? 'Resolved discussions will appear here.'
          : 'Start a discussion by clicking the comment icon on a field.'}
      </p>
    </div>
  );
}

function DiscussionsSkeleton() {
  return (
    <div className="py-3 px-3 space-y-3">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-gray-100 dark:border-gray-800 p-3 space-y-3 animate-pulse"
        >
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
