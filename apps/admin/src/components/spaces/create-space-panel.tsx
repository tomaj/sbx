'use client'

import { useState, useEffect } from 'react'
import { Building2 } from 'lucide-react'
import { RightSidebar } from '@/components/ui/right-sidebar'

interface CreateSpacePanelProps {
  open: boolean
  onClose: () => void
  onCreated: (spaceId: number) => void
}

export function CreateSpacePanel({ open, onClose, onCreated }: CreateSpacePanelProps) {
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName('')
    setDomain('')
    setError(null)
  }, [open])

  const canCreate = name.trim().length > 0

  async function handleCreate() {
    if (!canCreate) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          domain: domain.trim() || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.message ?? 'Failed to create space')
        return
      }
      const data = await res.json()
      onCreated(data.space?.id)
    } finally {
      setSaving(false)
    }
  }

  return (
    <RightSidebar
      open={open}
      onClose={onClose}
      header={
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-teal-600" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">New Space</h2>
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!canCreate || saving}
            className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Creating...' : 'Create Space'}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Space name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Marketing"
            autoFocus
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Space URL
          </label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="e.g. https://my-site.example.com"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <p className="mt-1.5 text-xs text-gray-400">
            Base URL of the website this space serves content for.
          </p>
        </div>
      </div>
    </RightSidebar>
  )
}
