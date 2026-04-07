'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';
import { DiscussionThread, type Discussion } from './discussion-thread';

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
    ? `/api/admin/spaces/${spaceId}/stories/${storyId}/discussions?by_status=${activeTab === 'resolved' ? 'solved' : 'unsolved'}`
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
