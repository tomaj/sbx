'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, RotateCcw, ChevronDown, ArrowLeftRight } from 'lucide-react'
import { UserAvatar } from '@/components/ui/user-avatar'

interface StoryVersion {
  id: number
  story_id: number
  release_id: number | null
  user_id: number | null
  user: { id: number; name: string | null; email: string | null; avatar_url?: string | null } | null
  action: string
  status: string
  name: string
  slug: string
  full_slug: string
  tag_list: string[]
  path: string | null
  is_startpage: boolean
  created_at: string
}

interface CompareChange {
  path: string
  old: any
  new: any
}

interface CompareResult {
  latest: StoryVersion | null
  target: StoryVersion | null
  changes: CompareChange[]
}

interface Props {
  spaceId: string
  storyId: number
  storyName: string
  previewUrl?: string
  onClose: () => void
  onRestore?: () => void
}

type Tab = 'history' | 'visual' | 'compare'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function actionLabel(v: StoryVersion) {
  const who = v.user?.name ?? 'Unknown'
  if (v.action === 'publish') return `${who} Published ${v.name}`
  if (v.action === 'unpublish') return `${who} Unpublished ${v.name}`
  if (v.action === 'create') return `${who} Created ${v.name}`
  return `${who} Saved ${v.name}`
}

function actionShortLabel(v: StoryVersion) {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  return cap(v.action === 'save' ? 'Saved' : v.action + 'd')
}

export function StoryHistoryPanel({ spaceId, storyId, storyName, previewUrl, onClose, onRestore }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('history')
  const [versions, setVersions] = useState<StoryVersion[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedVersion, setSelectedVersion] = useState<StoryVersion | null>(null)
  const [restoring, setRestoring] = useState(false)

  // Compare state
  const [compareLeft, setCompareLeft] = useState<StoryVersion | null>(null)
  const [compareRight, setCompareRight] = useState<StoryVersion | null>(null)
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null)
  const [compareLoading, setCompareLoading] = useState(false)

  const loadVersions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/spaces/${spaceId}/story_versions?by_story_id=${storyId}&by_release_id=0&per_page=50`,
      )
      if (!res.ok) return
      const data = await res.json()
      const list: StoryVersion[] = data.story_versions ?? []
      setVersions(list)
      setTotal(data.total ?? list.length)
      if (list.length > 0 && !selectedVersion) {
        setSelectedVersion(list[0])
        setCompareLeft(list[0])
        if (list.length > 1) setCompareRight(list[1])
      }
    } finally {
      setLoading(false)
    }
  }, [spaceId, storyId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadVersions() }, [loadVersions])

  async function handleRestore(v: StoryVersion) {
    if (!confirm(`Restore to version from ${formatDate(v.created_at)}?`)) return
    setRestoring(true)
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/stories/${storyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story: { content: v.name, name: v.name } }),
      })
      // After restore, reload versions and notify parent
      if (res.ok) {
        onRestore?.()
        onClose()
      }
    } finally {
      setRestoring(false)
    }
  }

  async function runCompare() {
    if (!compareLeft || !compareRight) return
    setCompareLoading(true)
    try {
      const res = await fetch(
        `/api/admin/spaces/${spaceId}/stories/${storyId}/compare?version_v2=${compareRight.id}`,
      )
      if (!res.ok) return
      const data = await res.json()
      setCompareResult(data)
    } finally {
      setCompareLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'compare' && compareLeft && compareRight) {
      runCompare()
    }
  }, [activeTab, compareLeft?.id, compareRight?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const previewUrlForVersion = selectedVersion && previewUrl
    ? previewUrl
    : undefined

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{storyName}</span>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body: main + sidebar */}
      <div className="flex flex-1 min-h-0">
        {/* Main area */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Tabs */}
          <div className="flex items-center gap-6 px-6 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            {(['history', 'visual', 'compare'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? 'border-green-600 text-green-700 dark:text-green-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {/* ── HISTORY TAB ── */}
            {activeTab === 'history' && (
              <div>
                {loading ? (
                  <HistorySkeleton />
                ) : versions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <RotateCcw className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm">No version history yet</p>
                  </div>
                ) : (
                  versions.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 dark:border-gray-800 group hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      <UserAvatar
                        name={v.user?.name ?? '?'}
                        src={v.user?.avatar_url ?? null}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {actionLabel(v)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">at {formatDate(v.created_at)}</p>
                      </div>
                      <button
                        onClick={() => handleRestore(v)}
                        disabled={restoring}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── VISUAL TAB ── */}
            {activeTab === 'visual' && (
              <div className="flex flex-col h-full">
                {selectedVersion && (
                  <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                    <UserAvatar
                      name={selectedVersion.user?.name ?? '?'}
                      src={selectedVersion.user?.avatar_url ?? null}
                      size="sm"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{actionLabel(selectedVersion)}</p>
                      <p className="text-xs text-gray-400">at {formatDate(selectedVersion.created_at)}</p>
                    </div>
                  </div>
                )}
                <div className="flex-1 relative bg-gray-100 dark:bg-gray-900">
                  {previewUrlForVersion ? (
                    <iframe
                      src={previewUrlForVersion}
                      className="w-full h-full border-0"
                      title="Version preview"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                      No preview URL configured
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── COMPARE TAB ── */}
            {activeTab === 'compare' && (
              <div className="flex flex-col h-full">
                {/* Version selectors */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                  <VersionSelect
                    versions={versions}
                    selected={compareLeft}
                    onSelect={setCompareLeft}
                    suffix="(Latest)"
                  />
                  <button
                    onClick={() => { setCompareLeft(compareRight); setCompareRight(compareLeft) }}
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                  </button>
                  <VersionSelect
                    versions={versions}
                    selected={compareRight}
                    onSelect={setCompareRight}
                  />
                </div>

                {/* Diff content */}
                <div className="flex-1 overflow-y-auto">
                  {compareLoading ? (
                    <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
                      Comparing versions...
                    </div>
                  ) : !compareResult ? null
                  : compareResult.changes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                      <ArrowLeftRight className="w-10 h-10 mb-3 opacity-30" />
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No content changes</p>
                      <p className="text-xs mt-1">The selected versions have no content difference.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {/* Version headers */}
                      <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
                        <div className="px-6 py-4 flex items-center gap-3">
                          {compareResult.latest && (
                            <>
                              <UserAvatar name={compareLeft?.user?.name ?? '?'} src={compareLeft?.user?.avatar_url ?? null} size="sm" />
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{compareLeft ? actionLabel(compareLeft) : ''}</p>
                                <p className="text-xs text-gray-400">{compareLeft ? `at ${formatDate(compareLeft.created_at)}` : ''}</p>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="px-6 py-4 flex items-center gap-3">
                          {compareResult.target && (
                            <>
                              <UserAvatar name={compareRight?.user?.name ?? '?'} src={compareRight?.user?.avatar_url ?? null} size="sm" />
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{compareRight ? actionLabel(compareRight) : ''}</p>
                                <p className="text-xs text-gray-400">{compareRight ? `at ${formatDate(compareRight.created_at)}` : ''}</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Change rows */}
                      {compareResult.changes.map((change, i) => (
                        <div key={i} className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
                          <div className="px-6 py-4">
                            <p className="text-xs text-gray-400 mb-1 font-mono">{change.path}</p>
                            <p className="text-sm text-blue-600 dark:text-blue-400 break-all">
                              {renderValue(change.new)}
                            </p>
                          </div>
                          <div className="px-6 py-4">
                            <p className="text-xs text-gray-400 mb-1 font-mono">{change.path}</p>
                            <p className="text-sm text-gray-500 break-all">
                              {renderValue(change.old)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Versions sidebar */}
        <div className="w-80 flex-shrink-0 border-l border-gray-200 dark:border-gray-800 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Versions</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <SidebarSkeleton />
            ) : (
              versions.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setSelectedVersion(v)
                    if (activeTab === 'history') setActiveTab('history')
                  }}
                  className={`w-full flex items-start gap-2 px-3 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 text-left transition-colors ${
                    selectedVersion?.id === v.id ? 'bg-green-50 dark:bg-green-950 border-l-2 border-l-green-600' : ''
                  }`}
                >
                  <div className="flex items-center gap-1 mt-0.5 flex-shrink-0">
                    <ChevronDown className="w-3 h-3 text-gray-400" />
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      v.status === 'published' ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  </div>
                  <UserAvatar
                    name={v.user?.name ?? '?'}
                    src={v.user?.avatar_url ?? null}
                    size="xs"
                  />
                  <div className="min-w-0 flex-1">
                    {(v.action === 'publish' || v.action === 'create') && (
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate leading-tight">
                        {actionLabel(v)}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 leading-tight">{formatDate(v.created_at)}</p>
                    <p className="text-xs text-gray-400 leading-tight">
                      {v.action === 'publish' ? 'Published' : v.action === 'unpublish' ? 'Unpublished' : 'Saved'} by {v.user?.name ?? 'Unknown'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function VersionSelect({
  versions,
  selected,
  onSelect,
  suffix,
}: {
  versions: StoryVersion[]
  selected: StoryVersion | null
  onSelect: (v: StoryVersion) => void
  suffix?: string
}) {
  return (
    <div className="relative flex-1">
      <select
        className="w-full appearance-none text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 pr-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        value={selected?.id ?? ''}
        onChange={(e) => {
          const v = versions.find((v) => v.id === parseInt(e.target.value))
          if (v) onSelect(v)
        }}
      >
        {versions.map((v) => (
          <option key={v.id} value={v.id}>
            {formatDate(v.created_at)}{suffix && v.id === versions[0]?.id ? ` ${suffix}` : ''}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  )
}

function renderValue(val: any): string {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'string') return val
  return JSON.stringify(val, null, 2)
}

function HistorySkeleton() {
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

function SidebarSkeleton() {
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-start gap-2 px-3 py-3 animate-pulse">
          <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1.5" />
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}
