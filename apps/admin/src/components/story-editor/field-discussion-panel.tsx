'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useApi } from '@/lib/swr';
import { X, CheckCircle, RotateCcw } from 'lucide-react';
import { useDelete } from '@/hooks/use-delete';
import { CommentRow, CommentsSkeleton } from './discussion-comment';
import { DiscussionReplyForm } from './discussion-reply-form';
import type { CommentData } from './discussion-comment';
import type { Collaborator } from './discussion-reply-form';

interface Discussion {
  id: number;
  field_key: string | null;
  resolved_at: string | null;
  comments: CommentData[];
}

interface Props {
  spaceId: string;
  storyId: number;
  fieldKey: string;
  fieldLabel: string;
  targetRect: DOMRect | null;
  onClose: () => void;
  onDiscussionChange?: () => void;
}

// The edit panel (right panel) outer div has style={{ width: 520 }} — tab strip is inside that 520
const EDIT_PANEL_WIDTH = 520;
const PANEL_WIDTH = 420;

export function FieldDiscussionPanel({
  spaceId,
  storyId,
  fieldKey,
  fieldLabel,
  targetRect,
  onClose,
  onDiscussionChange,
}: Props) {
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: collaboratorsData } = useApi<{
    collaborators: Array<{
      user?: {
        id: number;
        firstname: string;
        lastname: string;
        email?: string | null;
        avatar?: string | null;
      };
    }>;
  }>(`/api/admin/spaces/${spaceId}/collaborators`);

  const collaborators: Collaborator[] = (collaboratorsData?.collaborators ?? [])
    .filter((c) => c.user)
    .map((c) => ({
      id: c.user!.id,
      name: [c.user!.firstname, c.user!.lastname].filter(Boolean).join(' '),
      email: c.user!.email ?? '',
      avatar: c.user!.avatar,
    }));

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const commentDelete = useDelete<CommentData>({
    getUrl: (c) => `/api/admin/spaces/${spaceId}/discussions/${discussion?.id}/comments/${c.id}`,
    onSuccess: () => {
      load();
      onDiscussionChange?.();
    },
    title: 'Delete comment',
    getMessage: () => 'This comment will be permanently deleted.',
  });

  // Calculate panel position: to the left of the edit panel, near the field
  const panelStyle = (() => {
    const right = EDIT_PANEL_WIDTH; // flush against edit panel
    const viewH = typeof window !== 'undefined' ? window.innerHeight : 800;
    const panelH = 480; // approximate height
    let top = targetRect ? Math.max(16, targetRect.top - 24) : viewH / 2 - panelH / 2;
    top = Math.min(top, viewH - panelH - 16);
    return { right, top, width: PANEL_WIDTH };
  })();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Find existing unsolved discussion for this field, or create one
      const listRes = await fetch(
        `/api/admin/spaces/${spaceId}/stories/${storyId}/discussions?by_status=unsolved&per_page=100`,
      );
      if (!listRes.ok) return;
      const listData = await listRes.json();
      let disc = (listData.discussions ?? []).find(
        (d: any) => d.field_key === fieldKey || d.fieldname === fieldKey,
      );
      if (!disc) {
        const createRes = await fetch(
          `/api/admin/spaces/${spaceId}/stories/${storyId}/discussions`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ discussion: { fieldname: fieldKey, title: fieldKey } }),
          },
        );
        if (!createRes.ok) return;
        disc = (await createRes.json()).discussion;
      }

      const commentsRes = await fetch(
        `/api/admin/spaces/${spaceId}/discussions/${disc.id}/comments`,
      );
      if (commentsRes.ok) {
        const commentsData = await commentsRes.json();
        setDiscussion({ ...disc, comments: commentsData.comments ?? [] });
      } else {
        setDiscussion({ ...disc, comments: [] });
      }
    } catch {
      setDiscussion(null);
    } finally {
      setLoading(false);
    }
  }, [spaceId, storyId, fieldKey]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!loading) textareaRef.current?.focus();
  }, [loading]);

  async function handleSend() {
    if (!message.trim() || !discussion || submitting) return;
    setSubmitting(true);
    try {
      await fetch(`/api/admin/spaces/${spaceId}/discussions/${discussion.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: { message: message.trim() } }),
      });
      setMessage('');
      await load();
      onDiscussionChange?.();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResolve() {
    if (!discussion) return;
    await fetch(`/api/admin/spaces/${spaceId}/discussions/${discussion.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discussion: { solved_at: new Date().toISOString() } }),
    });
    await load();
    onDiscussionChange?.();
  }

  async function handleUnresolve() {
    if (!discussion) return;
    await fetch(`/api/admin/spaces/${spaceId}/discussions/${discussion.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discussion: { solved_at: null } }),
    });
    await load();
    onDiscussionChange?.();
  }

  const isResolved = !!discussion?.resolved_at;

  return (
    <>
      {/* Invisible click-away backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel positioned left of the edit panel */}
      <div
        className="fixed z-50 flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        style={{
          right: panelStyle.right,
          top: panelStyle.top,
          width: panelStyle.width,
          maxHeight: '75vh',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Discussion</h2>
            <span className="text-xs text-gray-400">· {fieldLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            {!loading &&
              discussion &&
              (isResolved ? (
                <button
                  type="button"
                  onClick={handleUnresolve}
                  className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 font-medium"
                >
                  <RotateCcw className="w-3 h-3" /> Re-open
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResolve}
                  className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 font-medium"
                >
                  <CheckCircle className="w-3 h-3" /> Resolve
                </button>
              ))}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Comments */}
        {!loading && discussion && discussion.comments.length > 0 && (
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0 border-b border-gray-100 dark:border-gray-800">
            {discussion.comments.map((comment) => (
              <CommentRow
                key={comment.id}
                comment={comment}
                onDelete={() => commentDelete.confirm(comment)}
              />
            ))}
          </div>
        )}

        {loading && (
          <div className="px-4 py-3 space-y-3 border-b border-gray-100 dark:border-gray-800">
            <CommentsSkeleton />
          </div>
        )}

        {/* Input area */}
        {!isResolved && (
          <DiscussionReplyForm
            collaborators={collaborators}
            message={message}
            onMessageChange={setMessage}
            onSend={handleSend}
            onClose={onClose}
            submitting={submitting}
            textareaRef={textareaRef}
          />
        )}

        {isResolved && (
          <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-400 text-center">This discussion is resolved.</p>
          </div>
        )}
      </div>

      {commentDelete.modal}
    </>
  );
}
