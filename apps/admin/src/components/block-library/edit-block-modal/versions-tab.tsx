'use client'

import { useState, useEffect, useCallback } from 'react'
import { Eye, RotateCcw } from 'lucide-react'
import { UserAvatar } from '@/components/ui/user-avatar'
import { formatDateTime } from '@/lib/date'

export interface ComponentVersionDetail {
  id: number
  component_id: number
  schema: Record<string, any>
  name: string
  display_name: string | null
  created_at: string
}

interface ComponentVersion {
  id: number
  event: string
  created_at: string
  author_id: string | null
  author: string | null
  author_avatar: string | null
  item_id: number
  is_draft: boolean
}

interface VersionsTabProps {
  spaceId: string
  blockId: string
  onPreview: (version: ComponentVersionDetail) => void
  onRestored: () => void
}

export function VersionsTab({ spaceId, blockId, onPreview, onRestored }: VersionsTabProps) {
  const [versions, setVersions] = useState<ComponentVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [previewLoadingId, setPreviewLoadingId] = useState<number | null>(null)
  const [restoringId, setRestoringId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchVersions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/admin/spaces/${spaceId}/components/${blockId}/component_versions?page=1&per_page=50`,
      )
      const data = await res.json()
      setVersions(data.versions ?? [])
    } catch {
      setError('Failed to load versions')
    } finally {
      setLoading(false)
    }
  }, [spaceId, blockId])

  useEffect(() => { fetchVersions() }, [fetchVersions])

  async function handlePreview(version: ComponentVersion) {
    setPreviewLoadingId(version.id)
    try {
      const res = await fetch(
        `/api/admin/spaces/${spaceId}/components/${blockId}/component_versions/${version.id}`,
      )
      const data = await res.json()
      onPreview(data.component_version)
    } catch {
      setError('Failed to load version')
    } finally {
      setPreviewLoadingId(null)
    }
  }

  async function handleRestore(versionId: number) {
    setRestoringId(versionId)
    setError(null)
    try {
      const res = await fetch(
        `/api/admin/spaces/${spaceId}/components/${blockId}/versions/${versionId}/restore`,
        { method: 'PUT' },
      )
      if (!res.ok) throw new Error()
      onRestored()
      await fetchVersions()
    } catch {
      setError('Failed to restore version')
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Track and restore block version history.
      </p>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[72px] bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : versions.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">
          No version history yet. Versions are saved on each block update.
        </p>
      ) : (
        <div className="space-y-2">
          {versions.map((version) => (
            <div
              key={version.id}
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 group hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
            >
              <UserAvatar name={version.author} src={version.author_avatar} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatDateTime(version.created_at)}
                </p>
                {version.author && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Last edited by {version.author}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handlePreview(version)}
                  disabled={previewLoadingId === version.id}
                  title="Preview version"
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-gray-100 disabled:opacity-40 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleRestore(version.id)}
                  disabled={restoringId === version.id}
                  title="Restore version"
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-gray-100 disabled:opacity-40 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-4">{error}</p>}
    </div>
  )
}
