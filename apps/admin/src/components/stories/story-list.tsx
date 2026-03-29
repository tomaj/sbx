'use client'

import { useEffect } from 'react'
import { Folder, Star, Home } from 'lucide-react'
import { UserAvatar } from '@/components/ui/user-avatar'
import { StoryStatusIcon } from './story-status-icon'

export type StoryUser = {
  name: string
  avatar: string | null
}

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
  release_ids?: number[]
  favourite_for_user_ids?: number[]
}

function StatusIcon({ story }: { story: Story }) {
  if (story.is_folder) {
    return <Folder className="w-4 h-4 text-gray-400" />
  }
  return <StoryStatusIcon published={story.published} unpublishedChanges={story.unpublished_changes} />
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}


interface StoryListProps {
  stories: Story[]
  usersMap: Record<number, StoryUser>
  isLoading: boolean
  selectedIds: Set<number>
  onSelectionChange: (ids: Set<number>) => void
  onNavigate: (story: Story) => void
  onOpen?: (story: Story) => void
  spaceId?: number
  currentUserId?: number
  showFavoritesOnly?: boolean
  onFavoriteCountChange?: (count: number) => void
  onToggleFavorite?: (storyId: number) => void
  showReleaseContentOnly?: boolean
  releasesMap?: Record<number, string>
}

export function StoryList({ stories, usersMap, isLoading, selectedIds, onSelectionChange, onNavigate, onOpen, spaceId, currentUserId, showFavoritesOnly, onFavoriteCountChange, onToggleFavorite, showReleaseContentOnly, releasesMap }: StoryListProps) {
  const isFav = (story: Story) =>
    currentUserId != null && (story.favourite_for_user_ids ?? []).includes(currentUserId)

  const displayedStories = showFavoritesOnly
    ? stories.filter((s) => isFav(s))
    : stories

  const favoriteCount = displayedStories.filter((s) => isFav(s)).length

  useEffect(() => {
    onFavoriteCountChange?.(favoriteCount)
  }, [favoriteCount, onFavoriteCountChange])

  const allSelected = displayedStories.length > 0 && displayedStories.every((s) => selectedIds.has(s.id))

  function toggleAll() {
    if (allSelected) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(displayedStories.map((s) => s.id)))
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
            <th className="w-10 py-3 pl-4 text-left" />
            <th className="w-10 py-3 px-3" />
            <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400 w-1/3">Name</th>
            <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Releases</th>
            <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Workflow Stage</th>
            <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Content Type</th>
            <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Last update</th>
            <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Author</th>
            <th className="w-10 py-3 pr-4" />
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 10 }).map((_, i) => (
            <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-4 pl-4 pr-2">
                <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              </td>
              <td className="py-4 pr-3">
                <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              </td>
              <td className="py-4 pr-4">
                <div className="h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mb-1.5" style={{ width: `${45 + (i * 17) % 35}%`, animationDelay: `${i * 40}ms` }} />
                <div className="h-3 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" style={{ width: `${25 + (i * 11) % 20}%`, animationDelay: `${i * 40 + 20}ms` }} />
              </td>
              <td className="py-4 pr-4"><div className="h-5 w-20 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" style={{ animationDelay: `${i * 40}ms` }} /></td>
              <td className="py-4 pr-4" />
              <td className="py-4 pr-4"><div className="h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" style={{ width: `${50 + (i * 13) % 30}%`, animationDelay: `${i * 40}ms` }} /></td>
              <td className="py-4 pr-4"><div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" style={{ animationDelay: `${i * 40}ms` }} /></td>
              <td className="py-4 pr-4"><div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
              <td className="py-4 pr-4" />
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (displayedStories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Folder className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm">
          {showFavoritesOnly
            ? 'No favorites in this space'
            : showReleaseContentOnly
              ? 'No stories in this release yet. Open a story and save it in the release context to add it.'
              : 'No stories found'}
        </p>
      </div>
    )
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 dark:border-gray-700">
          <th className="w-10 py-3 pl-4 text-left">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
          </th>
          <th className="w-10 py-3 px-3" />
          <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400 w-1/3">Name</th>
          <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Releases</th>
          <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Workflow Stage</th>
          <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Content Type</th>
          <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Last update</th>
          <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Author</th>
          <th className="w-10 py-3 pr-4" />
        </tr>
      </thead>
      <tbody>
        {displayedStories.map((story) => (
          <tr
            key={story.id}
            className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
              selectedIds.has(story.id) ? 'bg-teal-50 dark:bg-teal-900/10' : ''
            }`}
          >
            <td className="py-4 pl-4 pr-2">
              <input
                type="checkbox"
                checked={selectedIds.has(story.id)}
                onChange={() => toggle(story.id)}
                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 shrink-0"
              />
            </td>
            <td className="py-4 px-3">
              <StatusIcon story={story} />
            </td>
            <td className="py-4 pr-4 w-1/3 max-w-0">
              {story.is_folder ? (
                <button
                  onClick={() => onNavigate(story)}
                  className="text-left hover:text-teal-600 dark:hover:text-teal-400 transition-colors w-full"
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{story.name}</div>
                  <div className="text-xs text-gray-400 truncate">{story.full_slug}</div>
                </button>
              ) : (
                <button
                  onClick={() => onOpen?.(story)}
                  className="text-left hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                >
                  <div className="flex items-center gap-1.5 font-medium text-gray-900 dark:text-gray-100 truncate">
                    <span className="truncate">{story.name}</span>
                    {story.is_startpage && <Home className="w-3.5 h-3.5 text-gray-400 shrink-0" title="Root of folder" />}
                  </div>
                  <div className="text-xs text-gray-400">{story.full_slug}</div>
                </button>
              )}
            </td>
            <td className="py-4 pr-4">
              {story.release_ids && story.release_ids.length > 0 ? (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 whitespace-nowrap cursor-default"
                  title={
                    releasesMap
                      ? story.release_ids.map((id) => releasesMap[id] ?? `#${id}`).join(', ')
                      : undefined
                  }
                >
                  In {story.release_ids.length} release{story.release_ids.length !== 1 ? 's' : ''}
                </span>
              ) : null}
            </td>
            <td className="py-4 pr-4 text-gray-400 dark:text-gray-500" />
            <td className="py-4 pr-4 text-gray-500 dark:text-gray-400">
              {story.content_type ?? '—'}
            </td>
            <td className="py-4 pr-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {story.updated_at ? formatDate(story.updated_at) : '—'}
            </td>
            <td className="py-4 pr-4">
              {story.last_author_id && usersMap[story.last_author_id] ? (
                <UserAvatar
                  name={usersMap[story.last_author_id].name}
                  src={usersMap[story.last_author_id].avatar}
                  size="sm"
                />
              ) : (
                <div className="size-7 rounded-full bg-gray-200 dark:bg-gray-700" />
              )}
            </td>
            <td className="py-4 pr-4">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleFavorite?.(story.id)
                }}
                className={`p-1 transition-colors ${
                  isFav(story)
                    ? 'text-yellow-400'
                    : 'text-gray-300 hover:text-yellow-400'
                }`}
              >
                <Star className={`size-4 ${isFav(story) ? 'fill-yellow-400' : ''}`} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
