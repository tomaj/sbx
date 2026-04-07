'use client';

import { useState } from 'react';
import { UserAvatar } from '@/components/ui/user-avatar';

export interface Collaborator {
  id: number;
  name: string;
  email: string;
  avatar?: string | null;
}

interface DiscussionReplyFormProps {
  collaborators: Collaborator[];
  message: string;
  onMessageChange: (message: string) => void;
  onSend: () => void;
  onClose: () => void;
  submitting: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function DiscussionReplyForm({
  collaborators,
  message,
  onMessageChange,
  onSend,
  onClose,
  submitting,
  textareaRef,
}: DiscussionReplyFormProps) {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [caretPos, setCaretPos] = useState(0);

  const filteredCollaborators =
    mentionQuery !== null
      ? collaborators.filter((c) => {
          const q = mentionQuery;
          return (
            (c.name ?? '').toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q)
          );
        })
      : [];

  function handleMessageChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    const pos = e.target.selectionStart ?? val.length;
    onMessageChange(val);
    setCaretPos(pos);
    const textUpToCaret = val.slice(0, pos);
    const mentionMatch = textUpToCaret.match(/@(\w*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1].toLowerCase());
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  }

  function insertMention(collaborator: Collaborator) {
    const textUpToCaret = message.slice(0, caretPos);
    const before = textUpToCaret.replace(/@\w*$/, '');
    const after = message.slice(caretPos);
    const mentionText = `@${collaborator.name} `;
    const newMessage = before + mentionText + after;
    onMessageChange(newMessage);
    setMentionQuery(null);
    setTimeout(() => {
      const newPos = before.length + mentionText.length;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(newPos, newPos);
    }, 0);
  }

  function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionQuery !== null && filteredCollaborators.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % filteredCollaborators.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(
          (i) => (i - 1 + filteredCollaborators.length) % filteredCollaborators.length,
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredCollaborators[mentionIndex]);
        return;
      }
    }
    if (e.key === 'Escape' && mentionQuery !== null) {
      e.preventDefault();
      e.stopPropagation();
      setMentionQuery(null);
      return;
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="flex-shrink-0 px-4 py-3 relative">
      {/* Mention dropdown */}
      {mentionQuery !== null && filteredCollaborators.length > 0 && (
        <div className="absolute bottom-full left-4 right-4 mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden z-10">
          {filteredCollaborators.slice(0, 6).map((c, i) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(c);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                i === mentionIndex
                  ? 'bg-teal-50 dark:bg-teal-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <UserAvatar name={c.name} src={c.avatar} size="xs" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                  {c.name || c.email}
                </p>
                {c.name && <p className="text-[10px] text-gray-400 truncate">{c.email}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={message}
        onChange={handleMessageChange}
        onKeyDown={handleTextareaKeyDown}
        placeholder="Write a comment and notify others with @"
        rows={2}
        className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:bg-white transition-colors"
      />
      <div className="flex items-center justify-end gap-2 mt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSend}
          disabled={!message.trim() || submitting}
          className="px-4 py-1.5 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Post
        </button>
      </div>
    </div>
  );
}
