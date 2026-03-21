'use client'

import { Folder, CircleDot, Circle, AlertCircle } from 'lucide-react'

export type Story = {
  id: number
  uuid: string
  name: string
  slug: string
  full_slug: string
  path: string | null
  parent_id: number | null
  content_type: string | null
  is_folder: boolean
  is_startpage: boolean
  published: boolean
  unpublished_changes: boolean
  position: number
  created_at: string
  updated_at: string
  published_at: string | null
  first_published_at: string | null
  last_author_id: number | null
}

function StatusIcon({ story }: { story: Story }) {
  if (story.is_folder) {
    return <Folder className="w-4 h-4 text-gray-400" />
  }
  if (story.published && !story.unpublished_changes) {
    return <CircleDot className="w-4 h-4 text-teal-500" />
  }
  if (story.published && story.unpublished_changes) {
    return <AlertCircle className="w-4 h-4 text-amber-500" />
  }
  return <Circle className="w-4 h-4 text-gray-300" />
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function AuthorAvatar({ authorId }: { authorId: number | null }) {
  if (!authorId) return <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700" />
  const initials = String(authorId).slice(-2)
  const colors = [
    'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500',
  ]
  const color = colors[authorId % colors.length]
  return (
    <div className={`w-7 h-7 rounded-full ${color} flex items-center justify-center text-white text-xs font-medium`}>
      {initials}
    </div>
  )
}

interface StoryListProps {
  stories: Story[]
  isLoading: boolean
  selectedIds: Set<number>
  onSelectionChange: (ids: Set<number>) => void
  onNavigate: (story: Story) => void
  onOpen?: (story: Story) => void
}

export function StoryList({ stories, isLoading, selectedIds, onSelectionChange, onNavigate, onOpen }: StoryListProps) {
  const allSelected = stories.length > 0 && stories.every((s) => selectedIds.has(s.id))
  const someSelected = stories.some((s) => selectedIds.has(s.id))

  function toggleAll() {
    if (allSelected) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(stories.map((s) => s.id)))
    }
  }

  function toggle(id: number) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectionChange(next)
  }

  if (isLoading) {
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="w-10 py-3 pl-4"><div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /></th>
            <th className="w-8" />
            <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Name</th>
            <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Content Type</th>
            <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Last update</th>
            <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Author</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 10 }).map((_, i) => (
            <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-3 pl-4"><div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
              <td className="py-3 pr-2"><div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
              <td className="py-3 pr-4">
                <div className="h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mb-1.5" style={{ width: `${45 + (i * 17) % 35}%`, animationDelay: `${i * 40}ms` }} />
                <div className="h-3 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" style={{ width: `${25 + (i * 11) % 20}%`, animationDelay: `${i * 40 + 20}ms` }} />
              </td>
              <td className="py-3 pr-4"><div className="h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" style={{ width: `${50 + (i * 13) % 30}%`, animationDelay: `${i * 40}ms` }} /></td>
              <td className="py-3 pr-4"><div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" style={{ animationDelay: `${i * 40}ms` }} /></td>
              <td className="py-3 pr-4"><div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (stories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Folder className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm">No stories found</p>
      </div>
    )
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 dark:border-gray-700">
          <th className="w-10 py-3 pl-4">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
              onChange={toggleAll}
              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
          </th>
          <th className="w-8" />
          <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Name</th>
          <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Content Type</th>
          <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Last update</th>
          <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Author</th>
        </tr>
      </thead>
      <tbody>
        {stories.map((story) => (
          <tr
            key={story.id}
            className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
              selectedIds.has(story.id) ? 'bg-teal-50 dark:bg-teal-900/10' : ''
            }`}
          >
            <td className="py-3 pl-4">
              <input
                type="checkbox"
                checked={selectedIds.has(story.id)}
                onChange={() => toggle(story.id)}
                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
            </td>
            <td className="py-3 pr-2">
              <StatusIcon story={story} />
            </td>
            <td className="py-3 pr-4">
              {story.is_folder ? (
                <button
                  onClick={() => onNavigate(story)}
                  className="text-left hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100">{story.name}</div>
                  <div className="text-xs text-gray-400">{story.slug}</div>
                </button>
              ) : (
                <button
                  onClick={() => onOpen?.(story)}
                  className="text-left hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100 hover:text-teal-600 dark:hover:text-teal-400">{story.name}</div>
                  <div className="text-xs text-gray-400">{story.slug}</div>
                </button>
              )}
            </td>
            <td className="py-3 pr-4 text-gray-500 dark:text-gray-400">
              {story.content_type ?? '—'}
            </td>
            <td className="py-3 pr-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {story.updated_at ? formatDate(story.updated_at) : '—'}
            </td>
            <td className="py-3 pr-4">
              <AuthorAvatar authorId={story.last_author_id} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
