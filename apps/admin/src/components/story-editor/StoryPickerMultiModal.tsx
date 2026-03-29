'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, CheckSquare, Square } from 'lucide-react'

interface StoryItem {
  id: number
  uuid: string
  name: string
  full_slug: string
}

interface Props {
  spaceId: string
  title: string
  filterContentType?: string[]
  useUuid?: boolean
  value?: string[]
  onSelect: (values: string[], names: Record<string, string>) => void
  onClose: () => void
}

export function StoryPickerMultiModal({ spaceId, title, filterContentType, useUuid, value, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [stories, setStories] = useState<StoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState<string[]>(value ?? [])
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)

    const params = new URLSearchParams({ per_page: '50', story_only: '1' })
    if (search) params.set('search', search)
    if (filterContentType?.length) params.set('content_type', filterContentType.join(','))

    fetch(`/api/admin/spaces/${spaceId}/stories?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        setStories(data.stories ?? [])
        setLoading(false)
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') setLoading(false)
      })

    return () => controller.abort()
  }, [spaceId, search, filterContentType])

  function toggleItem(itemValue: string) {
    setPending(prev =>
      prev.includes(itemValue) ? prev.filter(v => v !== itemValue) : [...prev, itemValue]
    )
  }

  function handleSave() {
    const names: Record<string, string> = {}
    for (const s of stories) {
      const v = useUuid ? s.uuid : String(s.id)
      if (pending.includes(v)) names[v] = s.name
    }
    onSelect(pending, names)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stories…"
              className="flex-1 text-sm bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Story list */}
        <div className="flex-1 overflow-y-auto">
          {loading && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
              <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/5" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-3/5" />
              </div>
            </div>
          ))}
          {!loading && stories.length === 0 && (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <span className="text-sm">No stories found</span>
            </div>
          )}
          {!loading && stories.map((story) => {
            const itemValue = useUuid ? story.uuid : String(story.id)
            const isSelected = pending.includes(itemValue)
            return (
              <button
                key={story.id}
                type="button"
                onClick={() => toggleItem(itemValue)}
                className={`w-full flex items-center gap-3 px-5 py-3.5 text-left border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                  isSelected ? 'bg-teal-50 dark:bg-teal-900/20' : ''
                }`}
              >
                {isSelected
                  ? <CheckSquare className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  : <Square className="w-4 h-4 text-gray-300 flex-shrink-0" />
                }
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{story.name}</p>
                  <p className="text-xs text-gray-400 truncate">/{story.full_slug}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <span className="text-sm text-gray-400">
            {pending.length > 0 ? `${pending.length} selected` : 'None selected'}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
