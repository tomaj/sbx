'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { UserAvatar } from './user-avatar'
import { ConfirmModal } from './confirm-modal'

export interface CommentData {
  id: number
  uuid: string
  discussion_id: number
  user_id: number | null
  user_name: string | null
  user_avatar: string | null
  message: string | null
  created_at: string | Date
  updated_at: string | Date
}

interface CommentItemProps {
  comment: CommentData
  onDelete?: (commentId: number) => Promise<void>
  canDelete?: boolean
}

function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 30) return `${diffD}d ago`
  return d.toLocaleDateString()
}

export function CommentItem({ comment, onDelete, canDelete }: CommentItemProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    if (!onDelete) return
    setIsDeleting(true)
    try {
      await onDelete(comment.id)
    } finally {
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  return (
    <>
      <div className="flex gap-2.5 group">
        <UserAvatar
          name={comment.user_name}
          src={comment.user_avatar}
          size="sm"
          className="mt-0.5 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
              {comment.user_name ?? 'Unknown'}
            </span>
            <span className="text-[10px] text-gray-400 shrink-0">
              {formatRelativeTime(comment.created_at)}
            </span>
            {canDelete && onDelete && (
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                disabled={isDeleting}
                className="ml-auto p-0.5 rounded text-gray-300 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-40"
                title="Delete comment"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
            {comment.message}
          </p>
        </div>
      </div>

      <ConfirmModal
        open={showConfirm}
        title="Delete comment"
        message="This comment will be permanently deleted."
        confirmLabel="Delete"
        dangerous
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  )
}
