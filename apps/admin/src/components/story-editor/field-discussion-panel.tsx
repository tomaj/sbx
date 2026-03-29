'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, CheckCircle, RotateCcw } from 'lucide-react'
import { UserAvatar } from '@/components/ui/user-avatar'
import { ConfirmModal } from '@/components/ui/confirm-modal'

interface CommentData {
  id: number
  uuid: string
  discussion_id: number
  user_id: number | null
  user_name: string | null
  user_avatar: string | null
  message: string | null
  created_at: string
}

interface Discussion {
  id: number
  field_key: string | null
  resolved_at: string | null
  comments: CommentData[]
}

interface Collaborator {
  id: number
  name: string
  email: string
  avatar?: string | null
}

interface Props {
  spaceId: string
  storyId: number
  fieldKey: string
  fieldLabel: string
  targetRect: DOMRect | null
  onClose: () => void
  onDiscussionChange?: () => void
}

function formatRelativeTime(date: string): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'a few seconds ago'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 30) return `${diffD}d ago`
  return d.toLocaleDateString()
}

function renderMessageWithMentions(message: string) {
  const parts = message.split(/(@\S+)/)
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="text-teal-600 dark:text-teal-400 font-medium">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

// The edit panel (right panel) outer div has style={{ width: 520 }} — tab strip is inside that 520
const EDIT_PANEL_WIDTH = 520
const PANEL_WIDTH = 420

export function FieldDiscussionPanel({
  spaceId,
  storyId,
  fieldKey,
  fieldLabel,
  targetRect,
  onClose,
  onDiscussionChange,
}: Props) {
  const [discussion, setDiscussion] = useState<Discussion | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)

  // Mention state
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionIndex, setMentionIndex] = useState(0)
  const [caretPos, setCaretPos] = useState(0)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Calculate panel position: to the left of the edit panel, near the field
  const panelStyle = (() => {
    const right = EDIT_PANEL_WIDTH // flush against edit panel
    const viewH = typeof window !== 'undefined' ? window.innerHeight : 800
    const panelH = 480 // approximate height
    let top = targetRect ? Math.max(16, targetRect.top - 24) : viewH / 2 - panelH / 2
    top = Math.min(top, viewH - panelH - 16)
    return { right, top, width: PANEL_WIDTH }
  })()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/discussions/field`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story_id: storyId, field_key: fieldKey }),
      })
      if (!res.ok) return
      const data = await res.json()
      const disc = data.discussion

      const commentsRes = await fetch(
        `/api/admin/spaces/${spaceId}/discussions/${disc.id}/comments`,
      )
      if (commentsRes.ok) {
        const commentsData = await commentsRes.json()
        setDiscussion({ ...disc, comments: commentsData.comments ?? [] })
      } else {
        setDiscussion({ ...disc, comments: [] })
      }
    } catch {
      setDiscussion(null)
    } finally {
      setLoading(false)
    }
  }, [spaceId, storyId, fieldKey])

  useEffect(() => { load() }, [load])

  // Load collaborators for @ mention
  useEffect(() => {
    fetch(`/api/admin/spaces/${spaceId}/collaborators`)
      .then((r) => r.json())
      .then((data: { collaborators?: Array<{ user?: { id: number; firstname: string; lastname: string; email?: string | null; avatar?: string | null } }> }) => {
        const list: Collaborator[] = (data.collaborators ?? [])
          .filter((c) => c.user)
          .map((c) => ({
            id: c.user!.id,
            name: [c.user!.firstname, c.user!.lastname].filter(Boolean).join(' '),
            email: c.user!.email ?? '',
            avatar: c.user!.avatar,
          }))
        setCollaborators(list)
      })
      .catch(() => {})
  }, [spaceId])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (mentionQuery !== null) setMentionQuery(null)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, mentionQuery])

  useEffect(() => {
    if (!loading) textareaRef.current?.focus()
  }, [loading])

  function handleMessageChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    const pos = e.target.selectionStart ?? val.length
    setMessage(val)
    setCaretPos(pos)
    const textUpToCaret = val.slice(0, pos)
    const mentionMatch = textUpToCaret.match(/@(\w*)$/)
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1].toLowerCase())
      setMentionIndex(0)
    } else {
      setMentionQuery(null)
    }
  }

  const filteredCollaborators =
    mentionQuery !== null
      ? collaborators.filter((c) => {
          const q = mentionQuery
          return (
            (c.name ?? '').toLowerCase().includes(q) ||
            (c.email ?? '').toLowerCase().includes(q)
          )
        })
      : []

  function insertMention(collaborator: Collaborator) {
    const textUpToCaret = message.slice(0, caretPos)
    const before = textUpToCaret.replace(/@\w*$/, '')
    const after = message.slice(caretPos)
    const mentionText = `@${collaborator.name} `
    const newMessage = before + mentionText + after
    setMessage(newMessage)
    setMentionQuery(null)
    setTimeout(() => {
      const newPos = before.length + mentionText.length
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(newPos, newPos)
    }, 0)
  }

  function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionQuery !== null && filteredCollaborators.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex((i) => (i + 1) % filteredCollaborators.length); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex((i) => (i - 1 + filteredCollaborators.length) % filteredCollaborators.length); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(filteredCollaborators[mentionIndex]); return }
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  async function handleSend() {
    if (!message.trim() || !discussion || submitting) return
    setSubmitting(true)
    try {
      await fetch(`/api/admin/spaces/${spaceId}/discussions/${discussion.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: { message: message.trim() } }),
      })
      setMessage('')
      setMentionQuery(null)
      await load()
      onDiscussionChange?.()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteComment() {
    if (!discussion || deleteTargetId == null) return
    await fetch(
      `/api/admin/spaces/${spaceId}/discussions/${discussion.id}/comments/${deleteTargetId}`,
      { method: 'DELETE' },
    )
    setDeleteTargetId(null)
    await load()
    onDiscussionChange?.()
  }

  async function handleResolve() {
    if (!discussion) return
    await fetch(`/api/admin/spaces/${spaceId}/discussions/${discussion.id}?action=resolve`, { method: 'PUT' })
    await load()
    onDiscussionChange?.()
  }

  async function handleUnresolve() {
    if (!discussion) return
    await fetch(`/api/admin/spaces/${spaceId}/discussions/${discussion.id}?action=unresolve`, { method: 'PUT' })
    await load()
    onDiscussionChange?.()
  }

  const isResolved = !!discussion?.resolved_at

  return (
    <>
      {/* Invisible click-away backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel positioned left of the edit panel */}
      <div
        className="fixed z-50 flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        style={{ right: panelStyle.right, top: panelStyle.top, width: panelStyle.width, maxHeight: '75vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Discussion</h2>
            <span className="text-xs text-gray-400">· {fieldLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            {!loading && discussion && (
              isResolved ? (
                <button type="button" onClick={handleUnresolve} className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 font-medium">
                  <RotateCcw className="w-3 h-3" /> Re-open
                </button>
              ) : (
                <button type="button" onClick={handleResolve} className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 font-medium">
                  <CheckCircle className="w-3 h-3" /> Resolve
                </button>
              )
            )}
            <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors">
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
                onDelete={() => setDeleteTargetId(comment.id)}
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
          <div className="flex-shrink-0 px-4 py-3 relative">
            {/* Mention dropdown */}
            {mentionQuery !== null && filteredCollaborators.length > 0 && (
              <div className="absolute bottom-full left-4 right-4 mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden z-10">
                {filteredCollaborators.slice(0, 6).map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); insertMention(c) }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                      i === mentionIndex ? 'bg-teal-50 dark:bg-teal-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <UserAvatar name={c.name} src={c.avatar} size="xs" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{c.name || c.email}</p>
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
                onClick={handleSend}
                disabled={!message.trim() || submitting}
                className="px-4 py-1.5 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Post
              </button>
            </div>
          </div>
        )}

        {isResolved && (
          <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-400 text-center">This discussion is resolved.</p>
          </div>
        )}
      </div>

      <ConfirmModal
        open={deleteTargetId != null}
        title="Delete comment"
        message="This comment will be permanently deleted."
        confirmLabel="Delete"
        dangerous
        onConfirm={handleDeleteComment}
        onCancel={() => setDeleteTargetId(null)}
      />
    </>
  )
}

function CommentRow({ comment, onDelete }: { comment: CommentData; onDelete: () => void }) {
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
  )
}

function CommentsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3.5 w-full bg-gray-100 dark:bg-gray-800 rounded" />
            <div className="h-3.5 w-3/4 bg-gray-100 dark:bg-gray-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
