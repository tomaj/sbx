'use client'

import { useState, useCallback, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, ChevronRight, Settings, Move, Files, Eye, EyeOff, Trash2 } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Pagination } from '@/components/ui/pagination'
import { SearchFilterBar, type ActiveFilter, type SortOption, type FilterField } from '@/components/ui/search-filter-bar'
import { StoryList, type Story, type StoryUser } from '@/components/stories/story-list'

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
    fetch(`/api/admin/spaces/${spaceId}/stories/ancestors?story_id=${currentParentId}`)
      .then((r) => r.json())
      .then((data) => setBreadcrumb((data.ancestors ?? []).map((s: Story) => ({ id: s.id, name: s.name }))))
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
  const [perPage, setPerPage] = useState(25)

  // ─── Selection ────────────────────────────────────────────────────────────
  const [selectedIds,   setSelectedIds]   = useState<Set<number>>(new Set())
  const [deleteOpen,    setDeleteOpen]    = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // ─── Load stories ─────────────────────────────────────────────────────────
  const loadStories = useCallback(async () => {
    setIsLoading(true)
    try {
      const qs = new URLSearchParams()
      qs.set('page', String(page))
      qs.set('per_page', String(perPage))
      if (search.trim()) qs.set('search', search.trim())
      qs.set('parent_id', currentParentId !== null ? String(currentParentId) : '')

      const { field, dir } = parseSortOption(sort)
      qs.set('sort_field', field)
      qs.set('sort_dir', dir)

      for (const f of activeFilters) {
        if (f.value) qs.set(f.key, f.value)
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
  }, [spaceId, page, perPage, search, sort, activeFilters, currentParentId])

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
    router.push(`/spaces/${spaceId}/content/${story.id}`)
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

  const hasSelection   = selectedIds.size > 0
  const singleSelected = selectedIds.size === 1

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Content</h1>
        <button className="flex items-center gap-1.5 px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
          <Plus className="w-4 h-4" />
          Create new
        </button>
      </div>

      {/* Toolbar */}
      <div className="px-8 pt-4 pb-3">
        <SearchFilterBar
          searchPlaceholder={breadcrumb.length > 0 ? `Search in ${breadcrumb[breadcrumb.length - 1].name}...` : 'Search stories...'}
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

      {/* Breadcrumb */}
      {breadcrumb.length > 0 && (
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
        />
      </div>

      {/* Pagination */}
      <Pagination
        total={total}
        page={page}
        perPage={perPage}
        onPageChange={setPage}
        onPerPageChange={(n) => { setPerPage(n); setPage(1) }}
      />

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
    </div>
  )
}
