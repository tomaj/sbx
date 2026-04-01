'use client'

import { useState, useCallback, useEffect, useRef, use } from 'react'
import { usePerPage } from '@/hooks/use-per-page'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, ChevronRight, Settings, Move, Files, Eye, EyeOff, Trash2, Star, ChevronDown, AlertTriangle, GitBranch, Rocket, SlidersHorizontal, Search, SquarePen, CalendarDays } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Pagination } from '@/components/ui/pagination'
import { SearchFilterBar, type ActiveFilter, type SortOption, type FilterField } from '@/components/ui/search-filter-bar'
import { StoryList, type Story, type StoryUser } from '@/components/stories/story-list'
import { RightSidebar } from '@/components/ui/right-sidebar'
import { CreateStoryPanel, CreateFolderPanel } from '@/components/stories/create-story-panel'

type Release = {
  id: number
  name: string
  uuid: string
  release_at: string | null
  released: boolean
  created_at: string
}

type Branch = {
  id: number
  name: string
  url: string | null
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'position_asc',           label: 'Default' },
  { value: 'created_at_asc',         label: 'Creation Date (asc)' },
  { value: 'created_at_desc',        label: 'Creation Date (desc)' },
  { value: 'first_published_at_asc', label: 'First Published Date (asc)' },
  { value: 'first_published_at_desc',label: 'First Published Date (desc)' },
  { value: 'published_at_asc',       label: 'Published Date (asc)' },
  { value: 'published_at_desc',      label: 'Published Date (desc)' },
  { value: 'updated_at_desc',        label: 'Updated (newest)' },
  { value: 'updated_at_asc',         label: 'Updated (oldest)' },
]

const PUBLISHED_FILTER: FilterField = {
  key: 'published', label: 'Published', type: 'select',
  options: [
    { value: 'true',  label: 'Published' },
    { value: 'false', label: 'Unpublished / Draft' },
  ],
}

function parseSortOption(sort: string): { field: string; dir: string } {
  const last = sort.lastIndexOf('_')
  return { field: sort.slice(0, last), dir: sort.slice(last + 1) }
}

type BreadcrumbEntry = { id: number; name: string }

const KNOWN_FILTER_KEYS: Record<string, { label: string; type: FilterField['type'] }> = {
  content_type: { label: 'Content Type', type: 'select' },
  tag:          { label: 'Tag',          type: 'select' },
  block:        { label: 'Blocks',       type: 'select' },
  published:    { label: 'Published',    type: 'select' },
}

// Sync activeFilters ↔ URL params
function filtersToParams(filters: ActiveFilter[]): Record<string, string> {
  return Object.fromEntries(filters.filter((f) => f.value).map((f) => [f.key, f.value]))
}

function paramsToFilters(params: URLSearchParams): ActiveFilter[] {
  return Object.entries(KNOWN_FILTER_KEYS).flatMap(([key, def]) => {
    const val = params.get(key)
    if (!val) return []
    return [{ key, label: def.label, type: def.type, value: val }]
  })
}

export default function ContentPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params)
  const router      = useRouter()
  const searchParams = useSearchParams()
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [favoriteCount, setFavoriteCount] = useState(0)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/admin/user/me')
      .then((r) => r.json())
      .then((data) => { if (data.user?.id) setCurrentUserId(data.user.id) })
      .catch(() => {})
  }, [])

  // ─── Branches (pipeline switcher) ─────────────────────────────────────────
  const [branches, setBranches] = useState<Branch[]>([])
  const [activeBranchId, setActiveBranchId] = useState<number | null>(null)
  const [showBranchDropdown, setShowBranchDropdown] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/spaces/${spaceId}/branches`)
      .then((r) => r.json())
      .then((data) => {
        const list: Branch[] = data.branches ?? []
        setBranches(list)
        // Default to first branch (Production)
        if (list.length > 0 && activeBranchId === null) {
          setActiveBranchId(list[0].id)
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId])

  const activeBranch = branches.find((b) => b.id === activeBranchId) ?? branches[0] ?? null

  // ─── Releases ─────────────────────────────────────────────────────────────
  const [releases, setReleases] = useState<Release[]>([])
  const [releasesLoading, setReleasesLoading] = useState(true)
  const releaseIdParam = searchParams.get('release_id')
  const [activeReleaseId, setActiveReleaseId] = useState<number | null>(() =>
    releaseIdParam ? parseInt(releaseIdParam) : null
  )
  const [showReleasesDropdown, setShowReleasesDropdown] = useState(false)

  const [releaseSearch, setReleaseSearch] = useState('')

  // Release sidebar (create / detail)
  const [releaseSidebarOpen, setReleaseSidebarOpen] = useState(false)
  const [editingRelease, setEditingRelease] = useState<Release | null>(null)
  const [releaseName, setReleaseName] = useState('')
  const [releaseAt, setReleaseAt] = useState('')
  const [releaseSaving, setReleaseSaving] = useState(false)
  const [deleteReleaseOpen, setDeleteReleaseOpen] = useState(false)
  const [releaseToDelete, setReleaseToDelete] = useState<Release | null>(null)
  const [conflictInfo, setConflictInfo] = useState<{ has_conflicts: boolean; conflicting_story_ids: number[] } | null>(null)
  const [publishReleaseOpen, setPublishReleaseOpen] = useState(false)
  const [showReleaseContentOnly, setShowReleaseContentOnly] = useState(false)
  const [scheduleDateOpen, setScheduleDateOpen] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')

  const loadReleases = useCallback(async () => {
    setReleasesLoading(true)
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/releases`)
      if (res.ok) {
        const data = await res.json()
        setReleases(data.releases ?? [])
      }
    } finally {
      setReleasesLoading(false)
    }
  }, [spaceId])

  useEffect(() => { loadReleases() }, [loadReleases])

  function openCreateRelease() {
    setEditingRelease(null)
    setReleaseName('')
    setReleaseAt('')
    setConflictInfo(null)
    setReleaseSidebarOpen(true)
  }

  async function openReleaseDetail(release: Release) {
    setEditingRelease(release)
    setReleaseName(release.name)
    setReleaseAt(release.release_at ? new Date(release.release_at).toISOString().slice(0, 16) : '')
    setConflictInfo(null)
    setReleaseSidebarOpen(true)
    // Load conflict info
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/releases/${release.id}/conflict-check`)
      if (res.ok) setConflictInfo(await res.json())
    } catch {}
  }

  async function saveRelease() {
    setReleaseSaving(true)
    try {
      const body = { name: releaseName, release_at: releaseAt || null }
      if (editingRelease) {
        await fetch(`/api/admin/spaces/${spaceId}/releases/${editingRelease.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ release: body }),
        })
      } else {
        await fetch(`/api/admin/spaces/${spaceId}/releases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      await loadReleases()
      setReleaseSidebarOpen(false)
    } finally {
      setReleaseSaving(false)
    }
  }

  async function publishRelease() {
    const target = editingRelease ?? activeRelease
    if (!target) return
    setReleaseSaving(true)
    try {
      await fetch(`/api/admin/spaces/${spaceId}/releases/${target.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ do_release: true }),
      })
      setPublishReleaseOpen(false)
      setReleaseSidebarOpen(false)
      if (activeReleaseId === target.id) setActiveReleaseId(null)
      await loadReleases()
    } finally {
      setReleaseSaving(false)
    }
  }

  function openScheduleDate() {
    setScheduleDate(activeRelease?.release_at ? new Date(activeRelease.release_at).toISOString().slice(0, 16) : '')
    setScheduleDateOpen(true)
  }

  async function saveScheduleDate() {
    if (!activeRelease) return
    await fetch(`/api/admin/spaces/${spaceId}/releases/${activeRelease.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ release: { name: activeRelease.name, release_at: scheduleDate || null } }),
    })
    await loadReleases()
    setScheduleDateOpen(false)
  }

  async function confirmDeleteRelease() {
    if (!releaseToDelete) return
    await fetch(`/api/admin/spaces/${spaceId}/releases/${releaseToDelete.id}`, { method: 'DELETE' })
    if (activeReleaseId === releaseToDelete.id) setActiveReleaseId(null)
    setDeleteReleaseOpen(false)
    setReleaseSidebarOpen(false)
    await loadReleases()
  }

  const activeRelease = releases.find((r) => r.id === activeReleaseId) ?? null

  // Reset "show release content only" when switching releases
  useEffect(() => { setShowReleaseContentOnly(false); setScheduleDateOpen(false) }, [activeReleaseId])

  // ─── Filter options (dynamic dropdowns) ───────────────────────────────────
  const [filterFields, setFilterFields] = useState<FilterField[]>([PUBLISHED_FILTER])

  useEffect(() => {
    fetch(`/api/admin/spaces/${spaceId}/stories/filter-options`)
      .then((r) => r.json())
      .then((data) => {
        setFilterFields([
          {
            key: 'content_type', label: 'Content Type', type: 'select',
            options: (data.content_types as string[]).map((v) => ({ value: v, label: v })),
          },
          {
            key: 'tag', label: 'Tag', type: 'select',
            options: (data.tags as string[]).map((v) => ({ value: v, label: v })),
          },
          {
            key: 'block', label: 'Blocks', type: 'select',
            options: (data.blocks as { value: string; label: string }[]),
          },
          PUBLISHED_FILTER,
        ])
      })
      .catch(() => {})
  }, [spaceId])

  // ─── Users map (for author avatars) ───────────────────────────────────────
  const [usersMap, setUsersMap] = useState<Record<number, StoryUser>>({})

  useEffect(() => {
    fetch(`/api/admin/spaces/${spaceId}/collaborators`)
      .then((r) => r.json())
      .then((data) => {
        const map: Record<number, StoryUser> = {}
        for (const c of data.collaborators ?? []) {
          if (c.user) {
            map[c.user.id] = {
              name: c.user.friendly_name || c.user.userid || c.user.email || '?',
              avatar: c.user.avatar ?? null,
            }
          }
        }
        setUsersMap(map)
      })
      .catch(() => {})
  }, [spaceId])

  // ─── Data ─────────────────────────────────────────────────────────────────
  const [stories, setStories] = useState<Story[]>([])
  const [total, setTotal]     = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // ─── Navigation — source of truth: URL ?parent_id=X ──────────────────────
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbEntry[]>([])
  const parentIdParam  = searchParams.get('parent_id')
  const currentParentId = parentIdParam ? parseInt(parentIdParam) : null

  useEffect(() => {
    if (!currentParentId) { setBreadcrumb([]); return }
    fetch(`/api/admin/spaces/${spaceId}/breadcrumbs?currentPage=1&parent_id=${currentParentId}`)
      .then((r) => r.json())
      .then((data) => setBreadcrumb((data.breadcrumbs ?? []).map((s: Story) => ({ id: s.id, name: s.name }))))
      .catch(() => {})
  }, [currentParentId, spaceId])

  // ─── Search / sort / filters — initialised from URL ───────────────────────
  const [search,        setSearch]        = useState(() => searchParams.get('search') ?? '')
  const [sort,          setSort]          = useState(() => searchParams.get('sort') ?? 'position_asc')
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>(() => paramsToFilters(searchParams))

  // When filter options load, backfill options into any already-active filters
  useEffect(() => {
    if (filterFields.length <= 1) return // still loading
    setActiveFilters((prev) =>
      prev.map((af) => {
        const def = filterFields.find((f) => f.key === af.key)
        return def ? { ...af, options: def.options } : af
      }),
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterFields])

  // ─── Persist search / sort / filters → URL ────────────────────────────────
  useEffect(() => {
    const p = new URLSearchParams(searchParams.toString())
    if (search) p.set('search', search); else p.delete('search')
    if (sort !== 'position_asc') p.set('sort', sort); else p.delete('sort')
    Object.keys(KNOWN_FILTER_KEYS).forEach((key) => p.delete(key))
    Object.entries(filtersToParams(activeFilters)).forEach(([k, v]) => p.set(k, v))
    router.replace(`?${p}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sort, activeFilters])

  // ─── Pagination ───────────────────────────────────────────────────────────
  const [page,    setPage]    = useState(1)
  const [perPage, setPerPage] = usePerPage('perPage:stories', 25)

  // ─── Selection ────────────────────────────────────────────────────────────
  const [selectedIds,   setSelectedIds]   = useState<Set<number>>(new Set())
  const [deleteOpen,    setDeleteOpen]    = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // ─── Create new ───────────────────────────────────────────────────────────
  const [createMenuOpen,    setCreateMenuOpen]    = useState(false)
  const [createStoryOpen,   setCreateStoryOpen]   = useState(false)
  const [createFolderOpen,  setCreateFolderOpen]  = useState(false)

  // ─── Load stories ─────────────────────────────────────────────────────────
  const loadStories = useCallback(async () => {
    setIsLoading(true)
    try {
      const qs = new URLSearchParams()

      if (activeReleaseId !== null && showReleaseContentOnly) {
        qs.set('page', String(page))
        qs.set('per_page', String(perPage))
        if (search.trim()) qs.set('text_search', search.trim())
        qs.set('in_release', String(activeReleaseId))
        const { field, dir } = parseSortOption(sort)
        qs.set('sort_by', `${field}:${dir}`)
      } else {
        qs.set('page', String(page))
        qs.set('per_page', String(perPage))
        qs.set('with_summary', '1')
        if (search.trim()) qs.set('text_search', search.trim())
        if (!search.trim() && !showFavoritesOnly) {
          qs.set('with_parent', currentParentId !== null ? String(currentParentId) : '0')
          if (currentParentId !== null) qs.set('in_current_folder', 'true')
        }
        const { field, dir } = parseSortOption(sort)
        qs.set('sort_by', `${field}:${dir}`)
        for (const f of activeFilters) {
          if (f.value) qs.set(f.key, f.value)
        }
        if (showFavoritesOnly && currentUserId !== null) {
          qs.set('favourite_of', String(currentUserId))
        }
      }

      const res = await fetch(`/api/admin/spaces/${spaceId}/stories?${qs}`)
      if (res.ok) {
        const data = await res.json()
        setStories(data.stories ?? [])
        setTotal(data.total ?? 0)
      }
    } finally {
      setIsLoading(false)
    }
  }, [spaceId, page, perPage, search, sort, activeFilters, currentParentId, activeReleaseId, showFavoritesOnly, showReleaseContentOnly, currentUserId])

  useEffect(() => { loadStories() }, [loadStories])
  useEffect(() => { setPage(1) }, [search, sort, activeFilters, currentParentId])
  useEffect(() => { setSelectedIds(new Set()) }, [stories])

  // ─── Navigation ──────────────────────────────────────────────────────────
  function navigateInto(story: Story) {
    const p = new URLSearchParams(searchParams.toString())
    p.set('parent_id', String(story.id))
    router.push(`?${p}`)
  }

  function openStory(story: Story) {
    const base = `/spaces/${spaceId}/content/${story.id}`
    router.push(activeReleaseId !== null ? `${base}?release_id=${activeReleaseId}` : base)
  }

  function navigateTo(index: number) {
    const p = new URLSearchParams(searchParams.toString())
    if (index < 0) p.delete('parent_id')
    else p.set('parent_id', String(breadcrumb[index].id))
    router.push(`?${p}`)
  }

  // ─── Bulk actions (stubs) ─────────────────────────────────────────────────
  async function handlePublish() {
    setActionLoading(true)
    try {
      await Promise.all([...selectedIds].map((id) =>
        fetch(`/api/admin/spaces/${spaceId}/stories/${id}/publish`, { method: 'POST' })))
      setSelectedIds(new Set()); await loadStories()
    } finally { setActionLoading(false) }
  }

  async function handleUnpublish() {
    setActionLoading(true)
    try {
      await Promise.all([...selectedIds].map((id) =>
        fetch(`/api/admin/spaces/${spaceId}/stories/${id}/unpublish`, { method: 'POST' })))
      setSelectedIds(new Set()); await loadStories()
    } finally { setActionLoading(false) }
  }

  async function handleDelete() {
    setActionLoading(true)
    try {
      await Promise.all([...selectedIds].map((id) =>
        fetch(`/api/admin/spaces/${spaceId}/stories/${id}`, { method: 'DELETE' })))
      setSelectedIds(new Set()); setDeleteOpen(false); await loadStories()
    } finally { setActionLoading(false) }
  }

  async function handleToggleFavorite(storyId: number) {
    if (currentUserId === null) return
    const story = stories.find((s) => s.id === storyId)
    if (!story) return
    const currentIds = story.favourite_for_user_ids ?? []
    const isFav = currentIds.includes(currentUserId)
    const newIds = isFav ? currentIds.filter((id) => id !== currentUserId) : [...currentIds, currentUserId]
    setStories((prev) => prev.map((s) =>
      s.id === storyId ? { ...s, favourite_for_user_ids: newIds } : s
    ))
    const res = await fetch(`/api/admin/spaces/${spaceId}/stories/${storyId}/partial_update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story: { favourite_for_user_ids: newIds } }),
    })
    if (!res.ok) {
      setStories((prev) => prev.map((s) =>
        s.id === storyId ? { ...s, favourite_for_user_ids: currentIds } : s
      ))
    }
  }

  const hasSelection   = selectedIds.size > 0
  const singleSelected = selectedIds.size === 1

  const spaceIdNum = parseInt(spaceId)
  const unreleased = releases.filter((r) => !r.released)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Content</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/spaces/${spaceId}/content/planner`}
            className="flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <CalendarDays className="w-4 h-4" />
            Content Planner
          </Link>
          <div className="relative">
            <button
              onClick={() => setCreateMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create new
            </button>
            {createMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setCreateMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-40 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                  <button
                    onClick={() => { setCreateMenuOpen(false); setCreateStoryOpen(true) }}
                    className="w-full text-left px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700"
                  >
                    <div className="flex items-start gap-3">
                      <SquarePen className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Story</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">A &ldquo;Story&rdquo; is what we call the content entries you can create.</div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => { setCreateMenuOpen(false); setCreateFolderOpen(true) }}
                    className="w-full text-left px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Files className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Folder</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Can be used to group your entries of specific content types.</div>
                      </div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Preview / Branch switcher */}
      <div className="px-8 pt-3 pb-2 flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowBranchDropdown((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <GitBranch className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400 text-xs">Preview</span>
            <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
              {activeBranch ? activeBranch.name : (
                <span className="inline-block w-16 h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse align-middle" />
              )}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
          </button>

          {showBranchDropdown && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowBranchDropdown(false)} />
              <div className="absolute left-0 top-full mt-1 z-40 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                {branches.length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-400">No branches</div>
                )}
                {branches.map((branch) => (
                  <button
                    key={branch.id}
                    onClick={() => { setActiveBranchId(branch.id); setShowBranchDropdown(false) }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      activeBranchId === branch.id
                        ? 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/20'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {branch.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pipelines settings link */}
        <a
          href={`/spaces/${spaceId}/settings/pipelines`}
          title="Open pipelines settings"
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </a>
      </div>

      {/* Release tabs */}
      <div className="px-8 pt-0 pb-0 flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
        {/* Current tab */}
        <button
          onClick={() => setActiveReleaseId(null)}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeReleaseId === null
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Current
        </button>

        {/* Releases dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowReleasesDropdown((v) => !v)}
            className={`flex items-center gap-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeReleaseId !== null
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {releasesLoading ? (
              <span className="inline-block w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : activeRelease ? (
              <span className="flex items-center gap-1">
                <GitBranch className="w-3.5 h-3.5" />
                {activeRelease.name}
              </span>
            ) : (
              <span>{unreleased.length} release{unreleased.length !== 1 ? 's' : ''}</span>
            )}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {showReleasesDropdown && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => { setShowReleasesDropdown(false); setReleaseSearch('') }} />
              <div className="absolute left-0 top-full mt-1 z-40 w-[420px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl flex flex-col max-h-[420px]">
                {/* Search */}
                <div className="p-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500 transition-colors">
                    <Search className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={releaseSearch}
                      onChange={(e) => setReleaseSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 outline-none"
                      autoFocus
                    />
                  </div>
                </div>

                {/* List */}
                <div className="overflow-y-auto flex-1">
                  {/* Count header */}
                  {!releaseSearch && (
                    <div className="px-4 pt-3 pb-1">
                      <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                        {unreleased.length} release{unreleased.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {unreleased.length === 0 && !releasesLoading && (
                    <div className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">No active releases</div>
                  )}

                  {unreleased
                    .filter((r) => !releaseSearch || r.name.toLowerCase().includes(releaseSearch.toLowerCase()))
                    .map((release) => {
                      const scheduleLabel = release.release_at
                        ? new Date(release.release_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : 'Not scheduled'
                      return (
                        <button
                          key={release.id}
                          onClick={() => { setActiveReleaseId(release.id); setShowReleasesDropdown(false); setReleaseSearch('') }}
                          className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                            activeReleaseId === release.id ? 'bg-teal-50 dark:bg-teal-900/20' : ''
                          }`}
                        >
                          <div className="flex flex-col items-start min-w-0">
                            <span className={`text-sm font-medium truncate ${activeReleaseId === release.id ? 'text-teal-700 dark:text-teal-300' : 'text-gray-800 dark:text-gray-200'}`}>
                              {release.name}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{scheduleLabel}</span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); openReleaseDetail(release); setShowReleasesDropdown(false); setReleaseSearch('') }}
                            className="ml-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
                            title="Edit release"
                          >
                            <SquarePen className="w-4 h-4" />
                          </button>
                        </button>
                      )
                    })
                  }
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 dark:border-gray-700/50 shrink-0">
                  <button
                    onClick={() => { setShowReleasesDropdown(false); setReleaseSearch(''); openCreateRelease() }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> New release
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick create button */}
        <button
          onClick={openCreateRelease}
          title="New release"
          className="ml-1 p-1.5 text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors -mb-px"
        >
          <Plus className="w-4 h-4" />
        </button>

      </div>

      {/* Release action bar — shown when a release is selected */}
      {activeRelease && (
        <div className="px-8 pt-3 pb-0">
          <div className="flex items-center justify-between px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800/50">
            {/* Left: schedule / edit / delete */}
            <div className="flex items-center gap-1">
              <div className="relative">
                <button
                  onClick={openScheduleDate}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                  <CalendarDays className="w-4 h-4" />
                  {activeRelease.release_at
                    ? new Date(activeRelease.release_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Set scheduled date'}
                </button>
                {scheduleDateOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setScheduleDateOpen(false)} />
                    <div className="absolute left-0 top-full mt-1 z-40 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Scheduled publish date</label>
                      <input
                        type="datetime-local"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 mb-3"
                      />
                      <div className="flex gap-2 justify-end">
                        {scheduleDate && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setScheduleDate('') }}
                            className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                          >
                            Clear
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setScheduleDateOpen(false) }}
                          className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); saveScheduleDate() }}
                          className="px-3 py-1.5 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => openReleaseDetail(activeRelease)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                title="Edit release"
              >
                <SquarePen className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setReleaseToDelete(activeRelease); setDeleteReleaseOpen(true) }}
                className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                title="Delete release"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Right: show release content only + publish now */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showReleaseContentOnly}
                  onChange={(e) => setShowReleaseContentOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                Show release content only
              </label>
              <button
                onClick={() => setPublishReleaseOpen(true)}
                className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Publish now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="px-8 pt-4 pb-3">
        <SearchFilterBar
          searchPlaceholder={
            showFavoritesOnly
              ? 'Search favorites...'
              : showReleaseContentOnly && activeRelease
              ? `Search in ${activeBranch?.name ?? 'Live'}...`
              : breadcrumb.length > 0
                ? `Search in ${breadcrumb[breadcrumb.length - 1].name}...`
                : 'Search stories...'
          }
          search={search}
          onSearchChange={setSearch}
          sortOptions={SORT_OPTIONS}
          sort={sort}
          onSortChange={setSort}
          filterFields={filterFields}
          activeFilters={activeFilters}
          onFiltersChange={setActiveFilters}
        />
      </div>

      {/* Favorites filter */}
      <div className="px-8 pb-2">
        <button
          onClick={() => setShowFavoritesOnly((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
            showFavoritesOnly
              ? 'border-yellow-400 text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-400/10'
              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <Star className={`size-3.5 ${showFavoritesOnly ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          Favorites
        </button>
      </div>

      {/* Breadcrumb — only in current view, not in favorites/release-content mode */}
      {activeReleaseId === null && !showFavoritesOnly && breadcrumb.length > 0 && (
        <div className="px-8 pb-3 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          <button onClick={() => navigateTo(-1)} className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
            Root
          </button>
          {breadcrumb.map((entry, i) => (
            <span key={entry.id} className="flex items-center gap-1">
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
              {i < breadcrumb.length - 1 ? (
                <button onClick={() => navigateTo(i)} className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                  {entry.name}
                </button>
              ) : (
                <span className="text-gray-900 dark:text-gray-100 font-medium">{entry.name}</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Story list */}
      <div className="flex-1 overflow-y-auto px-8 pb-4">
        <StoryList
          stories={stories}
          usersMap={usersMap}
          isLoading={isLoading}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onNavigate={navigateInto}
          onOpen={openStory}
          spaceId={spaceIdNum}
          currentUserId={currentUserId ?? undefined}
          showFavoritesOnly={showFavoritesOnly}
          onFavoriteCountChange={setFavoriteCount}
          onToggleFavorite={handleToggleFavorite}
          showReleaseContentOnly={showReleaseContentOnly}
          releasesMap={Object.fromEntries(releases.map((r) => [r.id, r.name]))}
        />
      </div>

      {/* Pagination — hidden in favorites mode */}
      {!showFavoritesOnly && (
        <Pagination
          total={total}
          page={page}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={(n) => { setPerPage(n); setPage(1) }}
          storageKey="perPage:stories"
        />
      )}

      {/* Bulk action bar */}
      {hasSelection && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 bg-gray-900 dark:bg-gray-800 text-white rounded-xl shadow-2xl px-4 py-3">
          <span className="text-sm font-medium mr-2 text-gray-300">{selectedIds.size} selected</span>
          {singleSelected && (
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-white/10 transition-colors">
              <Settings className="w-4 h-4" /> Settings
            </button>
          )}
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-white/10 transition-colors">
            <Move className="w-4 h-4" /> Move
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-white/10 transition-colors">
            <Files className="w-4 h-4" /> Duplicate
          </button>
          <button onClick={handlePublish} disabled={actionLoading} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50">
            <Eye className="w-4 h-4" /> Publish
          </button>
          <button onClick={handleUnpublish} disabled={actionLoading} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50">
            <EyeOff className="w-4 h-4" /> Unpublish
          </button>
          <div className="w-px h-5 bg-white/20 mx-1" />
          <button onClick={() => setDeleteOpen(true)} disabled={actionLoading} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      )}

      <ConfirmModal
        open={deleteOpen}
        title="Delete Stories"
        message={`Are you sure you want to delete ${selectedIds.size} stor${selectedIds.size === 1 ? 'y' : 'ies'}? This action cannot be undone.`}
        confirmLabel="Delete"
        dangerous
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      {/* Release sidebar */}
      <RightSidebar
        open={releaseSidebarOpen}
        onClose={() => setReleaseSidebarOpen(false)}
        header={
          <div>
            <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {editingRelease ? 'Edit Release' : 'New Release'}
            </div>
            {editingRelease && (
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{editingRelease.name}</div>
            )}
          </div>
        }
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-2">
              {editingRelease && (
                <button
                  onClick={() => { setReleaseToDelete(editingRelease); setDeleteReleaseOpen(true) }}
                  className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Delete
                </button>
              )}
              {editingRelease && !editingRelease.released && (
                <button
                  onClick={() => setPublishReleaseOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                >
                  <Rocket className="w-3.5 h-3.5" /> Publish release
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setReleaseSidebarOpen(false)}
                className="px-4 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveRelease}
                disabled={releaseSaving || !releaseName.trim()}
                className="px-4 py-1.5 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {releaseSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input
              type="text"
              value={releaseName}
              onChange={(e) => setReleaseName(e.target.value)}
              placeholder="Release name"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Scheduled publish <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={releaseAt}
              onChange={(e) => setReleaseAt(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Conflict info */}
          {conflictInfo && conflictInfo.has_conflicts && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <strong>Conflicts detected.</strong> {conflictInfo.conflicting_story_ids.length} stor{conflictInfo.conflicting_story_ids.length === 1 ? 'y' : 'ies'} in this release also appear in other releases.
              </div>
            </div>
          )}
          {conflictInfo && !conflictInfo.has_conflicts && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
              <div className="text-sm text-green-700 dark:text-green-300">No conflicts detected.</div>
            </div>
          )}
        </div>
      </RightSidebar>

      {/* Confirm: delete release */}
      <ConfirmModal
        open={deleteReleaseOpen}
        title="Delete Release"
        message={`Are you sure you want to delete release "${releaseToDelete?.name}"? This will remove all story changes in this release.`}
        confirmLabel="Delete"
        dangerous
        onConfirm={confirmDeleteRelease}
        onCancel={() => setDeleteReleaseOpen(false)}
      />

      {/* Confirm: publish release */}
      <ConfirmModal
        open={publishReleaseOpen}
        title="Publish Release"
        message={`Publish "${(editingRelease ?? activeRelease)?.name}"? All story changes in this release will go live immediately.`}
        confirmLabel="Publish"
        onConfirm={publishRelease}
        onCancel={() => setPublishReleaseOpen(false)}
      />

      {/* Create story/folder panels */}
      <CreateStoryPanel
        spaceId={spaceId}
        open={createStoryOpen}
        defaultParentId={currentParentId}
        onClose={() => setCreateStoryOpen(false)}
        onCreated={(storyId) => { setCreateStoryOpen(false); loadStories(); router.push(`/spaces/${spaceId}/content/${storyId}`) }}
      />
      <CreateFolderPanel
        spaceId={spaceId}
        open={createFolderOpen}
        defaultParentId={currentParentId}
        onClose={() => setCreateFolderOpen(false)}
        onCreated={() => { setCreateFolderOpen(false); loadStories() }}
      />
    </div>
  )
}
