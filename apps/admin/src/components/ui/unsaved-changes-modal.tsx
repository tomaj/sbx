'use client'

import { useEffect } from 'react'
import { X, TriangleAlert } from 'lucide-react'

interface UnsavedChangesModalProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function UnsavedChangesModal({ open, onConfirm, onCancel }: UnsavedChangesModalProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center"
      onClick={onCancel}
    >
      <div
        className="relative bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 rounded-xl border border-gray-600 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-amber-800 flex items-center justify-center">
            <TriangleAlert className="w-8 h-8 text-amber-300" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-white text-center mb-3">
          Discard changes?
        </h2>

        <p className="text-sm text-gray-400 text-center mb-8">
          There are some changes which are not saved. Are you sure you want to discard the changes?
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-600 text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold transition-colors"
          >
            Discard changes
          </button>
        </div>
      </div>
    </div>
  )
}
