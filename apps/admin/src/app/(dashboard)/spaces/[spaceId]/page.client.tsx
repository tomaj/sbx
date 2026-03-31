'use client'

import { use, useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BookOpen, Images, LayoutPanelLeft, Database, Users,
  ChevronRight, ChevronDown, ChevronLeft,
  Pencil, Plus, Trash2, Upload, Download, CloudUpload,
  Settings, Workflow, KeyRound, MessageSquare, CheckSquare,
} from 'lucide-react'
import { UserAvatar } from '@/components/ui/user-avatar'
import { authClient } from '@/lib/auth-client'
import {
  formatActivityKey,
  resolveItemName,
} from '@/components/activities/activity-utils'

interface SpaceInfo {
  id: number
  name: string
}

interface Stats {
  stories: number | null
  assets: number | null
  blocks: number | null
  datasources: number | null
  users: number | null
}

interface ActivityRow {
  id: number
  activity: {
    id: number
    key: string
    trackable_id: number | null
    trackable_type: string | null
    created_at: string
  }
  trackable: { id: string | number; name: string; slug: string } | null
  user: {
    id: number
    userid: string
    friendly_name: string
    avatar: string | null
  } | null
}

interface MentionDiscussion {
  id: number
  uuid: string
  title: string | null
  fieldname: string | null
  field_key: string | null
  story_id: number | null
  solved_at: string | null
  created_at: string
  last_comment: {
    id: number
    message: string | null
    message_json: any[]
    user_id: number | null
    uuid: string
    created_at: string
    updated_at: string
  } | null
}

interface ApprovalRow {
  id: number
  story_id: number
  approver_id: number
  status: string
  story_name: string | null
  story_full_slug: string | null
  created_at: string
}

type ActivityTab = 'team' | 'my_edits' | 'assigned' | 'mentions'

const TABS: { key: ActivityTab; label: string }[] = [
  { key: 'team', label: 'Team' },
  { key: 'my_edits', label: 'My last edits' },
  { key: 'assigned', label: 'Assigned to me' },
  { key: 'mentions', label: 'My Mentions' },
]

const PER_PAGE = 10

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return 'a few seconds ago'
  const mins = Math.floor(secs / 60)
  if (mins === 1) return 'a minute ago'
  if (mins < 60) return `${mins} minutes ago`
  const hours = Math.floor(mins / 60)
  if (hours === 1) return 'an hour ago'
  if (hours < 24) return `${hours} hours ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
}

function ActivityIcon({ activityKey }: { activityKey: string }) {
  const verb = activityKey.slice(activityKey.lastIndexOf('.') + 1)
  const iconClass = 'size-4 text-gray-400'
  switch (verb) {
    case 'create': return <Plus className={iconClass} />
    case 'update': return <Pencil className={iconClass} />
    case 'delete': return <Trash2 className={iconClass} />
    case 'publish': return <Upload className={iconClass} />
    case 'unpublish': return <Download className={iconClass} />
    case 'deploy': return <CloudUpload className={iconClass} />
    default: return <Pencil className={iconClass} />
  }
}

const STAT_CARDS = [
  { key: 'stories' as const, label: 'Stories', icon: BookOpen, color: 'text-blue-500', href: 'content' },
  { key: 'assets' as const, label: 'Assets', icon: Images, color: 'text-green-500', href: 'assets' },
  { key: 'blocks' as const, label: 'Blocks', icon: LayoutPanelLeft, color: 'text-purple-500', href: 'block-library' },
  { key: 'datasources' as const, label: 'Datasources', icon: Database, color: 'text-amber-500', href: 'datasources' },
  { key: 'users' as const, label: 'Users', icon: Users, color: 'text-teal-500', href: 'settings/users' },
]

const SPACE_ACTIONS = [
  { label: 'Settings', icon: Settings, href: 'settings/space' },
  { label: 'Workflows', icon: Workflow, href: 'settings/workflows' },
  { label: 'Access Tokens', icon: KeyRound, href: 'settings/access-tokens' },
]

function SpaceActionsDropdown({ spaceId }: { spaceId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        Space actions
        <ChevronDown className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 py-1">
          {SPACE_ACTIONS.map(({ label, icon: Icon, href }) => (
            <button
              key={href}
              onClick={() => { router.push(`/spaces/${spaceId}/${href}`); setOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <Icon className="size-4 text-gray-400" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SimplePagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (p: number) => void
}) {
  // Show up to 5 page buttons around current
  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
  const end = Math.min(totalPages, start + 4)
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i)

  return (
    <div className="flex items-center justify-center gap-1 py-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="size-4 text-gray-500" />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
            p === page
              ? 'bg-teal-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="size-4 text-gray-500" />
      </button>
    </div>
  )
}

export default function SpaceDashboardPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params)
  const { data: session } = authClient.useSession()

  const [space, setSpace] = useState<SpaceInfo | null>(null)
  const [stats, setStats] = useState<Stats>({ stories: null, assets: null, blocks: null, datasources: null, users: null })
  const [activities, setActivities] = useState<ActivityRow[] | null>(null)
  const [activitiesTotal, setActivitiesTotal] = useState(0)
  const [activitiesPage, setActivitiesPage] = useState(1)
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const [tab, setTab] = useState<ActivityTab>('team')
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string | null>(null)
  const [mentionDiscussions, setMentionDiscussions] = useState<MentionDiscussion[] | null>(null)
  const [mentionTotal, setMentionTotal] = useState(0)
  const [approvalRows, setApprovalRows] = useState<ApprovalRow[] | null>(null)

  // Load space info
  useEffect(() => {
    fetch(`/api/admin/spaces/${spaceId}/space`)
      .then((r) => r.json())
      .then((d) => { if (d.space) setSpace(d.space) })
  }, [spaceId])

  // Load stats
  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/spaces/${spaceId}/stories?per_page=1`).then((r) => r.json()),
      fetch(`/api/admin/spaces/${spaceId}/assets/counts`).then((r) => r.json()),
      fetch(`/api/admin/spaces/${spaceId}/components`).then((r) => r.json()),
      fetch(`/api/admin/spaces/${spaceId}/datasources?per_page=1`).then((r) => r.json()),
      fetch(`/api/admin/spaces/${spaceId}/collaborators`).then((r) => r.json()),
    ]).then(([storiesData, assetsData, blocksData, dsData, colData]) => {
      setStats({
        stories: storiesData.total ?? 0,
        assets: assetsData.total ?? 0,
        blocks: (blocksData.components ?? []).length,
        datasources: dsData.total ?? 0,
        users: (colData.collaborators ?? []).length,
      })
    })
  }, [spaceId])

  // Find current user's integer ID and name
  useEffect(() => {
    if (!session?.user?.email) return
    fetch(`/api/admin/users?per_page=100&filter=all`)
      .then((r) => r.json())
      .then((d) => {
        const found = (d.users ?? []).find((u: { id: number; email: string; firstname?: string; lastname?: string }) => u.email === session.user.email)
        if (found) {
          setCurrentUserId(found.id)
          const name = [found.firstname, found.lastname].filter(Boolean).join(' ')
          if (name) setCurrentUserName(name)
        }
      })
  }, [session?.user?.email])

  // Load activities (team + my_edits tabs)
  const fetchActivities = useCallback(async () => {
    if (tab !== 'team' && tab !== 'my_edits') return
    // For my_edits wait until we know the current user id
    if (tab === 'my_edits' && !currentUserId) { setActivitiesLoading(false); return }
    setActivitiesLoading(true)
    const p = new URLSearchParams({ spaceId, per_page: String(PER_PAGE), page: String(activitiesPage) })
    if (tab === 'my_edits') p.set('user_ids', String(currentUserId))
    const res = await fetch(`/api/admin/activities?${p}`)
    if (res.ok) {
      const d = await res.json()
      setActivities(d.activities ?? [])
      setActivitiesTotal(d.total ?? 0)
    }
    setActivitiesLoading(false)
  }, [spaceId, tab, activitiesPage, currentUserId])

  // Load mentions (My Mentions tab)
  const fetchMentions = useCallback(async () => {
    if (tab !== 'mentions') return
    setActivitiesLoading(true)
    const p = new URLSearchParams({ page: String(activitiesPage), per_page: String(PER_PAGE) })
    const res = await fetch(`/api/admin/spaces/${spaceId}/discussions/mentions?${p}`)
    if (res.ok) {
      const d = await res.json()
      setMentionDiscussions(d.discussions ?? [])
      setMentionTotal((d.discussions ?? []).length)
    }
    setActivitiesLoading(false)
  }, [spaceId, tab, activitiesPage])

  // Load approvals (Assigned to me tab)
  const fetchApprovals = useCallback(async () => {
    if (tab !== 'assigned') return
    if (!currentUserId) { setActivitiesLoading(false); return }
    setActivitiesLoading(true)
    const p = new URLSearchParams({ approver: String(currentUserId), with_story: 'true' })
    const res = await fetch(`/api/admin/spaces/${spaceId}/approvals?${p}`)
    if (res.ok) {
      const d = await res.json()
      setApprovalRows(d.approvals ?? [])
    }
    setActivitiesLoading(false)
  }, [spaceId, tab, currentUserId])

  useEffect(() => { fetchActivities() }, [fetchActivities])
  useEffect(() => { fetchMentions() }, [fetchMentions])
  useEffect(() => { fetchApprovals() }, [fetchApprovals])

  function handleTabChange(t: ActivityTab) {
    setTab(t)
    setActivitiesPage(1)
    setActivities(null)
    setMentionDiscussions(null)
    setApprovalRows(null)
    setActivitiesLoading(true)
  }

  const totalItems = tab === 'mentions' ? mentionTotal : activitiesTotal
  const totalPages = Math.max(1, Math.ceil(totalItems / PER_PAGE))

  // Get last activity for "last updated" header info
  const lastActivity = activities?.[0]

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          {space ? (
            <>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{space.name}</h1>
              {lastActivity && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Last updated by {lastActivity.user?.friendly_name ?? 'Unknown'}{' '}
                  {timeAgo(lastActivity.activity.created_at)}
                  {' · '}
                  {formatDateTime(lastActivity.activity.created_at)}
                </p>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <div className="h-8 w-40 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="h-4 w-72 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            </div>
          )}
        </div>
        <SpaceActionsDropdown spaceId={spaceId} />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, color, href }) => (
          <Link
            key={key}
            href={`/spaces/${spaceId}/${href}`}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col gap-3 hover:shadow-lg hover:border-teal-400 dark:hover:border-teal-500 hover:-translate-y-0.5 transition-all duration-150"
          >
            <Icon className={`size-5 ${color}`} />
            {stats[key] === null ? (
              <div className="space-y-1.5">
                <div className="h-7 w-16 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div className="h-3.5 w-14 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              </div>
            ) : (
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats[key]?.toLocaleString()}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Activity */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
        {/* Activity header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Activity</h2>
          <Link
            href={`/spaces/${spaceId}/activities`}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            View Activities
            <ChevronRight className="size-4" />
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 mt-4 border-b border-gray-100 dark:border-gray-700">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                tab === key
                  ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Activity rows */}
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {activitiesLoading ? (
            Array.from({ length: PER_PAGE }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="size-5 rounded bg-gray-200 dark:bg-gray-700 animate-pulse shrink-0" />
                <div className="size-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-56 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                  <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                </div>
                <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              </div>
            ))
          ) : tab === 'assigned' ? (
            approvalRows === null || approvalRows.length === 0 ? (
              <p className="px-6 py-10 text-sm text-gray-400 text-center">No pending approvals.</p>
            ) : (
              approvalRows.map((row) => (
                <div key={row.id} className="flex items-center gap-4 px-6 py-3.5">
                  <div className="size-8 flex items-center justify-center shrink-0">
                    <CheckSquare className="size-4 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      Approval requested
                    </p>
                    {row.story_name ? (
                      <Link
                        href={`/spaces/${spaceId}/content/${row.story_id}`}
                        className="text-xs text-teal-600 dark:text-teal-400 hover:underline truncate mt-0.5 block"
                      >
                        {row.story_name}
                      </Link>
                    ) : (
                      <p className="text-xs text-gray-400 truncate mt-0.5">Story #{row.story_id}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium capitalize">
                      {row.status}
                    </span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {timeAgo(row.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )
          ) : tab === 'mentions' ? (
            mentionDiscussions === null || mentionDiscussions.length === 0 ? (
              <p className="px-6 py-10 text-sm text-gray-400 text-center">No mentions yet.</p>
            ) : (
              mentionDiscussions.map((disc) => (
                <div key={disc.id} className="flex items-start gap-4 px-6 py-3.5">
                  <div className="size-8 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare className="size-4 text-teal-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {disc.title ?? disc.fieldname ?? 'Discussion'}
                    </p>
                    {disc.last_comment && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5 italic">
                        {disc.last_comment.message}
                      </p>
                    )}
                    {disc.story_id && (
                      <Link
                        href={`/spaces/${spaceId}/content/${disc.story_id}`}
                        className="text-xs text-teal-600 dark:text-teal-400 hover:underline mt-0.5 block truncate"
                      >
                        Story #{disc.story_id}{disc.fieldname ? ` · ${disc.fieldname}` : ''}
                      </Link>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                    {timeAgo(disc.last_comment?.created_at ?? disc.created_at)}
                  </span>
                </div>
              ))
            )
          ) : (
            activities === null || activities.length === 0 ? (
              <p className="px-6 py-10 text-sm text-gray-400 text-center">No activity yet.</p>
            ) : (
              activities.map((row) => {
                const userName = row.user?.friendly_name ?? 'Unknown'
                const itemName = resolveItemName(
                  row.trackable as { name?: string } | null,
                  row.activity.trackable_type,
                )
                return (
                  <div key={row.id} className="flex items-center gap-4 px-6 py-3.5">
                    <div className="size-8 flex items-center justify-center shrink-0">
                      <ActivityIcon activityKey={row.activity.key} />
                    </div>
                    <UserAvatar name={userName} src={row.user?.avatar} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {userName}{' '}
                        <span className="font-normal text-gray-600 dark:text-gray-400">
                          {formatActivityKey(row.activity.key).toLowerCase()}
                        </span>
                      </p>
                      {row.activity.trackable_id && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {itemName && `${itemName} · `}#{row.activity.trackable_id}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                      {timeAgo(row.activity.created_at)}
                    </span>
                  </div>
                )
              })
            )
          )}
        </div>

        {/* Pagination (not shown for assigned tab — loads all at once) */}
        {totalPages > 1 && tab !== 'assigned' && (
          <div className="border-t border-gray-100 dark:border-gray-700">
            <SimplePagination
              page={activitiesPage}
              totalPages={totalPages}
              onPageChange={(p) => setActivitiesPage(p)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
