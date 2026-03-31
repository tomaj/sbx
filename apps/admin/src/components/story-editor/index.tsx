'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Globe, History, ChevronDown, X,
  Pencil, Info, Diamond, MessageSquare, SlidersHorizontal,
  Monitor, FileText, Layers, LayoutList,
  Smartphone, Maximize2, Settings, ExternalLink, Calendar,
  MoreHorizontal, Image, Database, Tag, AppWindow,
} from 'lucide-react'
import { EditTab } from './edit-tab'
import { InfoTab } from './info-tab'
import { ConfigTab } from './config-tab'
import { CommentTab } from './comment-tab'
import { FieldDiscussionPanel } from './field-discussion-panel'
import { LayersPanel } from './layers-panel'
import { StoryHistoryPanel } from './story-history-panel'
import type { ComponentMeta, ComponentGroup, StoryDetail } from './types'

interface PreviewUrl {
  name: string
  location: string
}

interface Props {
  spaceId: string
  story: StoryDetail | null
  componentSchema: Record<string, any> | null
  allComponents: ComponentMeta[]
  allGroups: ComponentGroup[]
  domain?: string
  previewUrls?: PreviewUrl[]
  mobileWidth?: number
  previewToken?: string
  publicToken?: string
  releaseId?: number | null
  releaseName?: string | null
  parentDisableFEEditor?: boolean
}

type PanelTab = 'edit' | 'info' | 'workflow' | 'comment' | 'config'
type LeftPanel = null | 'layers' | 'content'
type ViewMode = 'desktop' | 'mobile' | 'fullwidth'

const PANEL_TABS: { id: PanelTab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'edit',     label: 'Edit',     Icon: Pencil },
  { id: 'info',     label: 'Info',     Icon: Info },
  { id: 'workflow', label: 'Workflow', Icon: Diamond },
  { id: 'comment',  label: 'Comment',  Icon: MessageSquare },
  { id: 'config',   label: 'Config',   Icon: SlidersHorizontal },
]

function PublishStatus({ story }: { story: StoryDetail | null }) {
  if (!story) return <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
  if (story.published && !story.unpublished_changes) {
    return <span className="w-3 h-3 rounded-full bg-teal-500 inline-block" title="Published" />
  }
  if (story.published && story.unpublished_changes) {
    return <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" title="Published (unpublished changes)" />
  }
  return <span className="w-3 h-3 rounded-full border-2 border-gray-400 inline-block" title="Draft" />
}

export function StoryEditor({
  spaceId,
  story: initialStory,
  componentSchema,
  allComponents,
  allGroups,
  domain = '',
  previewUrls = [],
  mobileWidth = 360,
  previewToken = '',
  publicToken = '',
  releaseId = null,
  releaseName = null,
  parentDisableFEEditor = false,
}: Props) {
  const router = useRouter()
  const [story, setStory] = useState<StoryDetail | null>(initialStory)
  const [content, setContent] = useState<Record<string, any>>(initialStory?.content ?? {})
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [activePanel, setActivePanel] = useState<PanelTab>('edit')
  const [showPublishMenu, setShowPublishMenu] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form-only mode: parent folder has disabled the visual editor
  const isFormOnly = parentDisableFEEditor

  const [showPreview, setShowPreview] = useState(!isFormOnly)
  const [activeLeftPanel, setActiveLeftPanel] = useState<LeftPanel>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('desktop')
  const previewStorageKey = `sbx-preview-url-${spaceId}`
  const [selectedPreviewKey, setSelectedPreviewKey] = useState<string>(
    () => (typeof window !== 'undefined' ? (localStorage.getItem(previewStorageKey) ?? 'domain') : 'domain')
  )
  const [showPreviewMenu, setShowPreviewMenu] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const [mobileViewWidth, setMobileViewWidth] = useState(mobileWidth)
  const [activeDiscussionField, setActiveDiscussionField] = useState<string | null>(null)
  const [activeDiscussionRect, setActiveDiscussionRect] = useState<DOMRect | null>(null)
  const [discussionCounts, setDiscussionCounts] = useState<Record<string, number>>({})
  const [openDiscussionCount, setOpenDiscussionCount] = useState(0)
  const [showHistory, setShowHistory] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [scheduleTime, setScheduleTime] = useState(() => new Date().toTimeString().slice(0, 5))
  const [scheduleTz, setScheduleTz] = useState('UTC')
  const [isScheduling, setIsScheduling] = useState(false)

  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Sync state when story prop arrives (null → loaded)
  useEffect(() => {
    if (initialStory && !story) {
      setStory(initialStory)
      setContent(initialStory.content ?? {})
    }
  }, [initialStory, story])

  // Build preview URL params for visual editor bridge
  const previewParams = useMemo(() => {
    if (!story) return ''
    const params = new URLSearchParams()
    params.set('_storyblok', String(story.id))
    params.set('_storyblok_tk[space_id]', spaceId)
    params.set('_storyblok_tk[timestamp]', '0')
    params.set('_storyblok_tk[token]', 'sbx-preview')
    return params.toString()
  }, [story, spaceId])

  useEffect(() => { setMobileViewWidth(mobileWidth) }, [mobileWidth])

  useEffect(() => {
    if (story?.name) {
      const prev = document.title
      document.title = `${story.name} | SBX`
      return () => { document.title = prev }
    }
  }, [story?.name])

  useEffect(() => {
    if (!showMoreMenu) return
    function handler(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMoreMenu])

  // Load discussion counts per field for badges
  const refreshDiscussionCounts = useCallback(() => {
    if (!story) return
    fetch(`/api/admin/spaces/${spaceId}/discussions?story_id=${story.id}`)
      .then((r) => r.json())
      .then((data: { discussions?: Array<{ field_key: string | null; comments: any[] }> }) => {
        const counts: Record<string, number> = {}
        let totalOpen = 0
        for (const d of data.discussions ?? []) {
          totalOpen++
          if (d.field_key) {
            counts[d.field_key] = (counts[d.field_key] ?? 0) + (d.comments?.length ?? 1)
          }
        }
        setDiscussionCounts(counts)
        setOpenDiscussionCount(totalOpen)
      })
      .catch(() => {})
  }, [story, spaceId])

  useEffect(() => { refreshDiscussionCounts() }, [refreshDiscussionCounts])

  function selectPreviewKey(key: string) {
    setSelectedPreviewKey(key)
    localStorage.setItem(previewStorageKey, key)
  }

  // Send live content updates to iframe preview
  useEffect(() => {
    if (!story || !iframeRef.current?.contentWindow) return
    const timer = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        { action: 'input', story: { ...story, content } },
        '*',
      )
    }, 300)
    return () => clearTimeout(timer)
  }, [content, story])

  // Listen for messages from the iframe (click-to-edit, loaded)
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      const data = e.data
      if (!data || typeof data.action !== 'string') return
      if (data.action === 'loaded' && story) {
        iframeRef.current?.contentWindow?.postMessage(
          { action: 'input', story: { ...story, content } },
          '*',
        )
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [story, content])

  function startResize(side: 'left' | 'right', startX: number) {
    const startWidth = mobileViewWidth
    function onMouseMove(e: MouseEvent) {
      const delta = e.clientX - startX
      const newWidth = side === 'left'
        ? Math.max(240, startWidth - delta)
        : Math.max(240, startWidth + delta)
      setMobileViewWidth(Math.round(newWidth))
    }
    function onMouseUp() {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  function getSelectedBase(): string {
    if (selectedPreviewKey === 'domain') return domain
    const idx = parseInt(selectedPreviewKey.replace('preview-', ''), 10)
    return previewUrls[idx]?.location ?? ''
  }

  const selectedPreviewBase = getSelectedBase()
  const fullPreviewUrl = story && selectedPreviewBase
    ? selectedPreviewBase.replace(/\/$/, '') + '/' + story.full_slug
      + '?' + previewParams
      + (releaseId != null ? '&_storyblok_release=' + releaseId : '')
    : ''

  // Links for the publish dropdown
  const openDraftUrl = fullPreviewUrl
  const openPublishedUrl = story && selectedPreviewBase
    ? selectedPreviewBase.replace(/\/$/, '') + '/' + story.full_slug + '?_storyblok_published=' + story.id
    : ''
  const draftJsonUrl = story && previewToken
    ? '/v2/cdn/stories/' + story.full_slug + '?version=draft&token=' + previewToken
      + (releaseId != null ? '&from_release=' + releaseId : '')
    : ''
  const publishedJsonUrl = story && publicToken
    ? '/v2/cdn/stories/' + story.full_slug + '?version=published&token=' + publicToken
    : ''

  function toggleLeftPanel(panel: LeftPanel) {
    setActiveLeftPanel(prev => prev === panel ? null : panel)
  }

  const handleFieldChange = useCallback((key: string, value: any) => {
    setContent((prev) => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }, [])

  async function save(): Promise<StoryDetail | null> {
    if (!story) return null
    setIsSaving(true)
    setError(null)
    try {
      const mapiBody: Record<string, any> = { story: { content } }
      if (releaseId != null) mapiBody.release_id = releaseId
      const res = await fetch(`/api/admin/spaces/${spaceId}/stories/${story.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapiBody),
      })
      if (!res.ok) throw new Error('Save failed')
      const data = await res.json()
      const updated = data.story as StoryDetail
      setStory(updated)
      setContent(updated.content)
      setIsDirty(false)
      return updated
    } catch (e) {
      setError('Failed to save. Please try again.')
      return null
    } finally {
      setIsSaving(false)
    }
  }

  async function handlePublish() {
    if (!story) return
    await save()
    setIsPublishing(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/stories/${story.id}/publish`, { method: 'POST' })
      if (!res.ok) throw new Error('Publish failed')
      const data = await res.json()
      setStory(data.story as StoryDetail)
    } catch (e) {
      setError('Failed to publish. Please try again.')
    } finally {
      setIsPublishing(false)
      setShowPublishMenu(false)
    }
  }

  async function handleUnpublish() {
    if (!story) return
    setIsPublishing(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/stories/${story.id}/unpublish`, { method: 'POST' })
      if (!res.ok) throw new Error('Unpublish failed')
      const data = await res.json()
      setStory(data.story as StoryDetail)
    } catch (e) {
      setError('Failed to unpublish. Please try again.')
    } finally {
      setIsPublishing(false)
      setShowPublishMenu(false)
    }
  }

  async function handleSchedule() {
    if (!story) return
    setIsScheduling(true)
    setError(null)
    try {
      // Build ISO datetime from date + time + timezone
      const offsetMap: Record<string, number> = {
        'UTC': 0, 'CET': 1, 'CEST': 2, 'EET': 2, 'EEST': 3,
        'EST': -5, 'EDT': -4, 'CST': -6, 'CDT': -5,
        'MST': -7, 'MDT': -6, 'PST': -8, 'PDT': -7,
      }
      const offsetHours = offsetMap[scheduleTz] ?? 0
      const localMs = new Date(`${scheduleDate}T${scheduleTime}:00`).getTime()
      const utcMs = localMs - offsetHours * 3600 * 1000
      const publishAt = new Date(utcMs).toISOString()
      const res = await fetch(`/api/admin/spaces/${spaceId}/stories/${story.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story: { publish_at: publishAt } }),
      })
      if (!res.ok) throw new Error('Schedule failed')
      const data = await res.json()
      setStory(data.story as StoryDetail)
      setShowScheduleModal(false)
      setShowPublishMenu(false)
    } catch {
      setError('Failed to schedule publishing. Please try again.')
    } finally {
      setIsScheduling(false)
    }
  }

  async function handleConfigSave(data: Partial<StoryDetail>) {
    if (!story) return
    setIsSaving(true)
    setError(null)
    try {
      const mapiBody: Record<string, any> = { story: data }
      if (releaseId != null) mapiBody.release_id = releaseId
      const res = await fetch(`/api/admin/spaces/${spaceId}/stories/${story.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapiBody),
      })
      if (!res.ok) throw new Error('Save failed')
      const result = await res.json()
      setStory(result.story as StoryDetail)
    } catch (e) {
      setError('Failed to save configuration.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
        <button
          type="button"
          onClick={() => {
            const parentId = story?.parent_id
            const base = parentId
              ? `/spaces/${spaceId}/content?parent_id=${parentId}`
              : `/spaces/${spaceId}/content`
            router.push(releaseId != null ? `${base}${parentId ? '&' : '?'}release_id=${releaseId}` : base)
          }}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>

        <div className="flex-1 min-w-0">
          {story ? (
            <>
              <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{story.name}</h1>
              <p className="text-xs text-gray-400 truncate">{story.full_slug}</p>
            </>
          ) : (
            <div className="space-y-1.5">
              <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            </div>
          )}
        </div>

        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300 flex-shrink-0"
        >
          <Globe className="w-4 h-4" />
          Default
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </button>

        <button
          type="button"
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300 flex-shrink-0"
        >
          <History className="w-4 h-4" />
          History
        </button>

        <PublishStatus story={story} />

        <button
          type="button"
          onClick={() => save()}
          disabled={isSaving || !isDirty || !story}
          className="px-4 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40 text-gray-700 dark:text-gray-300 flex-shrink-0"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>

        <div className="relative flex flex-shrink-0">
          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing || !story}
            className="px-4 py-1.5 text-sm font-medium bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-l-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            {isPublishing ? 'Publishing...' : 'Publish'}
          </button>
          <button
            type="button"
            onClick={() => setShowPublishMenu(!showPublishMenu)}
            disabled={!story}
            className="px-2 py-1.5 text-sm font-medium bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-r-lg border-l border-gray-700 dark:border-gray-300 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            <ChevronDown className="w-4 h-4" />
          </button>

          {showPublishMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowPublishMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => { setShowScheduleModal(true); setShowPublishMenu(false) }}
                  className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Calendar className="w-4 h-4 text-gray-400" />
                  Schedule Publishing
                </button>
                <div className="h-px bg-gray-100 dark:bg-gray-700" />
                {openDraftUrl ? (
                  <a
                    href={openDraftUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowPublishMenu(false)}
                    className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                    Open Draft
                  </a>
                ) : (
                  <span className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed">
                    <ExternalLink className="w-4 h-4" />
                    Open Draft
                  </span>
                )}
                {openPublishedUrl ? (
                  <a
                    href={openPublishedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowPublishMenu(false)}
                    className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                    Open Published
                  </a>
                ) : (
                  <span className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed">
                    <ExternalLink className="w-4 h-4" />
                    Open Published
                  </span>
                )}
                <div className="h-px bg-gray-100 dark:bg-gray-700" />
                {draftJsonUrl ? (
                  <a
                    href={draftJsonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowPublishMenu(false)}
                    className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <FileText className="w-4 h-4 text-gray-400" />
                    Draft JSON
                  </a>
                ) : (
                  <span className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed">
                    <FileText className="w-4 h-4" />
                    Draft JSON
                  </span>
                )}
                {publishedJsonUrl ? (
                  <a
                    href={publishedJsonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowPublishMenu(false)}
                    className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <FileText className="w-4 h-4 text-gray-400" />
                    Published JSON
                  </a>
                ) : (
                  <span className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed">
                    <FileText className="w-4 h-4" />
                    Published JSON
                  </span>
                )}
                {story?.published && (
                  <>
                    <div className="h-px bg-gray-100 dark:bg-gray-700" />
                    <button
                      type="button"
                      onClick={handleUnpublish}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Unpublish
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm border-b border-red-200 dark:border-red-800 flex-shrink-0">
          {error}
        </div>
      )}

      {/* Release context banner */}
      {releaseId != null && (
        <div className="px-4 py-2 bg-teal-50 dark:bg-teal-900/20 border-b border-teal-200 dark:border-teal-800 flex items-center gap-2 flex-shrink-0">
          <Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
          <span className="text-xs text-teal-700 dark:text-teal-300">
            Editing in release: <strong>{releaseName ?? `#${releaseId}`}</strong> — changes go into the release snapshot, not live content.
          </span>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-14 flex flex-col items-center py-3 gap-1 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
          {!isFormOnly && (
            <button
              type="button"
              onClick={() => setShowPreview(p => !p)}
              title={showPreview ? 'Switch to Form' : 'Switch to Visual'}
              className="flex flex-col items-center gap-0.5 w-full py-2 px-1 rounded-lg transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              {showPreview ? <FileText className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
              <span className="text-[10px] font-medium">{showPreview ? 'Form' : 'Visual'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => toggleLeftPanel('layers')}
            title="Layers"
            className={`flex flex-col items-center gap-0.5 w-full py-2 px-1 rounded-lg transition-colors ${
              activeLeftPanel === 'layers'
                ? 'bg-gray-100 dark:bg-gray-800 text-teal-600 dark:text-teal-400'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="text-[10px] font-medium">Layers</span>
          </button>

          <button
            type="button"
            onClick={() => toggleLeftPanel('content')}
            title="Content"
            className={`flex flex-col items-center gap-0.5 w-full py-2 px-1 rounded-lg transition-colors ${
              activeLeftPanel === 'content'
                ? 'bg-gray-100 dark:bg-gray-800 text-teal-600 dark:text-teal-400'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
          >
            <LayoutList className="w-4 h-4" />
            <span className="text-[10px] font-medium">Content</span>
          </button>

          {/* More menu */}
          <div ref={moreMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setShowMoreMenu(p => !p)}
              title="More"
              className={`flex flex-col items-center gap-0.5 w-full py-2 px-1 rounded-lg transition-colors ${
                showMoreMenu
                  ? 'bg-gray-100 dark:bg-gray-800 text-teal-600 dark:text-teal-400'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              <MoreHorizontal className="w-4 h-4" />
              <span className="text-[10px] font-medium">More</span>
            </button>

            {showMoreMenu && (
              <div className="absolute left-full top-0 ml-2 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
                {[
                  { href: `/spaces/${spaceId}/assets`, icon: Image, label: 'Assets' },
                  { href: `/spaces/${spaceId}/datasources`, icon: Database, label: 'Datasources' },
                  { href: `/spaces/${spaceId}/tags`, icon: Tag, label: 'Tags' },
                  { href: `/spaces/${spaceId}/block-library`, icon: AppWindow, label: 'App Directory' },
                  { href: `/spaces/${spaceId}/settings`, icon: Settings, label: 'Settings' },
                ].map(({ href, icon: Icon, label }) => (
                  <a
                    key={href}
                    href={href}
                    onClick={() => setShowMoreMenu(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                  >
                    <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    {label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Layers panel */}
        {activeLeftPanel === 'layers' && (
          <LayersPanel content={content} onClose={() => setActiveLeftPanel(null)} />
        )}

        {/* Content panel (placeholder) */}
        {activeLeftPanel === 'content' && (
          <div className="w-72 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Content</h3>
              <button
                type="button"
                onClick={() => setActiveLeftPanel(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-gray-400"
              >
                ×
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <p className="text-sm">Coming soon</p>
            </div>
          </div>
        )}

        {/* Preview pane */}
        {showPreview && (
          <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Preview toolbar */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
              <div className="flex items-center gap-0.5 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('desktop')}
                  title="Open desktop view"
                  className={`p-1.5 rounded transition-colors ${viewMode === 'desktop' ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('mobile')}
                  title="Open mobile view"
                  className={`p-1.5 rounded transition-colors ${viewMode === 'mobile' ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                >
                  <Smartphone className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('fullwidth')}
                  title="Open full-width view"
                  className={`p-1.5 rounded transition-colors ${viewMode === 'fullwidth' ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 text-xs text-gray-400 dark:text-gray-500 truncate text-center min-w-0">
                {fullPreviewUrl || (story ? 'No preview URL configured' : '')}
              </div>

              <div className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPreviewMenu(p => !p)}
                  title="Preview URL settings"
                  className={`p-1.5 rounded transition-colors ${showPreviewMenu ? 'bg-gray-100 dark:bg-gray-800 text-gray-700' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                >
                  <Settings className="w-4 h-4" />
                </button>

                {showPreviewMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowPreviewMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 z-20 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-3">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Preview URLs</span>
                        <button
                          type="button"
                          onClick={() => { setShowPreviewMenu(false); router.push(`/spaces/${spaceId}/settings/visual-editor`) }}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          title="Edit preview URLs"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {domain && (
                          <button
                            type="button"
                            onClick={() => { selectPreviewKey('domain'); setShowPreviewMenu(false) }}
                            className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${selectedPreviewKey === 'domain' ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                          >
                            <div className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{domain}</div>
                            <div className="text-xs text-gray-400">- Default</div>
                          </button>
                        )}
                        {previewUrls.map((pu, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => { selectPreviewKey(`preview-${i}`); setShowPreviewMenu(false) }}
                            className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${selectedPreviewKey === `preview-${i}` ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                          >
                            <div className="text-xs text-gray-800 dark:text-gray-200 truncate">{pu.location}</div>
                            <div className="text-xs text-gray-400">- {pu.name}</div>
                          </button>
                        ))}
                        {!domain && previewUrls.length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-2">No preview URLs configured</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Preview area */}
            <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-800">
              {!story ? (
                <div className="w-full h-full animate-pulse bg-gray-200 dark:bg-gray-700" />
              ) : !fullPreviewUrl ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <Settings className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No preview URL</p>
                    <p className="text-xs mt-1">
                      Configure one in{' '}
                      <button
                        type="button"
                        onClick={() => router.push(`/spaces/${spaceId}/settings/visual-editor`)}
                        className="underline hover:text-gray-600"
                      >
                        Visual Editor settings
                      </button>
                    </p>
                  </div>
                </div>
              ) : viewMode === 'mobile' ? (
                <div className="flex h-full items-stretch justify-center py-4">
                  <div className="flex items-center justify-center flex-shrink-0 w-8">
                    <span
                      className="text-[10px] text-gray-400 select-none whitespace-nowrap"
                      style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
                    >
                      {mobileViewWidth !== mobileWidth ? `Custom W:${mobileViewWidth}` : `Mobile W:${mobileWidth}`}
                    </span>
                  </div>
                  <div
                    className="flex items-center justify-center w-4 flex-shrink-0 cursor-ew-resize group select-none"
                    onMouseDown={(e) => { e.preventDefault(); startResize('left', e.clientX) }}
                  >
                    <div className="w-1 h-10 bg-gray-300 dark:bg-gray-600 rounded-full group-hover:bg-gray-400 dark:group-hover:bg-gray-500 transition-colors" />
                  </div>
                  <div
                    className="bg-white rounded-lg overflow-hidden flex-shrink-0"
                    style={{
                      width: mobileViewWidth,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)',
                    }}
                  >
                    <iframe
                      ref={iframeRef}
                      src={fullPreviewUrl}
                      className="w-full h-full border-none"
                      title="Story preview"
                    />
                  </div>
                  <div
                    className="flex items-center justify-center w-4 flex-shrink-0 cursor-ew-resize group select-none"
                    onMouseDown={(e) => { e.preventDefault(); startResize('right', e.clientX) }}
                  >
                    <div className="w-1 h-10 bg-gray-300 dark:bg-gray-600 rounded-full group-hover:bg-gray-400 dark:group-hover:bg-gray-500 transition-colors" />
                  </div>
                </div>
              ) : (
                <iframe
                  ref={iframeRef}
                  src={fullPreviewUrl}
                  className="w-full h-full border-none"
                  title="Story preview"
                />
              )}
            </div>
          </div>
        )}

        {/* Right panel */}
        <div className={`flex ${showPreview ? 'flex-shrink-0' : 'flex-1'}`} style={showPreview ? { width: 520 } : undefined}>
          <div className={`flex-1 flex flex-col overflow-hidden ${showPreview ? 'border-r border-gray-200 dark:border-gray-700' : ''}`}>
            <div className={`flex-1 flex flex-col overflow-hidden ${!showPreview ? 'max-w-3xl mx-auto w-full' : ''}`}>
              {activePanel === 'edit' && (
                <EditTab
                  spaceId={spaceId}
                  schema={componentSchema}
                  content={content}
                  allComponents={allComponents}
                  allGroups={allGroups}
                  onChange={handleFieldChange}
                  loading={!story}
                  onOpenDiscussion={story ? (fk, rect) => { setActiveDiscussionField(fk); setActiveDiscussionRect(rect) } : undefined}
                  activeDiscussionField={activeDiscussionField}
                  discussionCounts={discussionCounts}
                />
              )}
              {activePanel === 'info' && (
                story
                  ? <InfoTab story={story} />
                  : <SkeletonFields rows={[60, 40, 80, 50, 70]} />
              )}
              {activePanel === 'workflow' && (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <Diamond className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Workflow — coming soon</p>
                  </div>
                </div>
              )}
              {activePanel === 'comment' && (
                <CommentTab
                  spaceId={spaceId}
                  storyId={story?.id ?? null}
                  onDiscussionChange={refreshDiscussionCounts}
                />
              )}
              {activePanel === 'config' && (
                story
                  ? <ConfigTab story={story} onSave={handleConfigSave} isFormOnly={isFormOnly} />
                  : <SkeletonFields rows={[70, 50, 90, 40, 65]} tall />
              )}
            </div>
          </div>

          {/* Vertical tab icons (far right) */}
          <div className="w-14 flex flex-col items-center py-3 gap-1 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex-shrink-0">
            {PANEL_TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActivePanel(id)}
                title={label}
                className={`flex flex-col items-center gap-0.5 w-full py-2 px-1 rounded-lg transition-colors ${
                  activePanel === id
                    ? 'bg-gray-100 dark:bg-gray-800 text-teal-600 dark:text-teal-400'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className="relative">
                  <Icon className="w-4 h-4" />
                  {id === 'comment' && openDiscussionCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                      {openDiscussionCount > 9 ? '9+' : openDiscussionCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Schedule Publishing modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowScheduleModal(false) }}>
          <div className="bg-gray-900 text-white rounded-2xl shadow-2xl w-[520px] p-7 relative">
            <button
              type="button"
              onClick={() => setShowScheduleModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5 text-gray-300" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1">Schedule Publishing</h2>
            <p className="text-sm text-gray-400 mb-6">Select a date and time for the publication of your story.</p>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-white mb-2">Date &amp; Time</label>
              <div className="flex items-center gap-2 bg-gray-800 border border-gray-600 rounded-xl px-4 py-3">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="flex-1 bg-transparent text-white text-sm outline-none [color-scheme:dark]"
                />
                <button type="button" onClick={() => setScheduleDate('')} className="text-gray-500 hover:text-gray-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mb-6">
              <div className="bg-gray-800 border border-gray-600 rounded-xl overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-600">
                  <span className="text-sm font-semibold text-white">Set Time</span>
                </div>
                <div className="flex">
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="flex-1 bg-transparent text-white text-sm px-4 py-3 outline-none border-r border-gray-600 [color-scheme:dark]"
                  />
                  <div className="relative flex-1">
                    <select
                      value={scheduleTz}
                      onChange={(e) => setScheduleTz(e.target.value)}
                      className="w-full bg-transparent text-white text-sm px-4 py-3 outline-none appearance-none cursor-pointer"
                    >
                      <option value="UTC">UTC</option>
                      <option value="CET">CET (UTC+1)</option>
                      <option value="CEST">CEST (UTC+2)</option>
                      <option value="EET">EET (UTC+2)</option>
                      <option value="EEST">EEST (UTC+3)</option>
                      <option value="EST">EST (UTC-5)</option>
                      <option value="EDT">EDT (UTC-4)</option>
                      <option value="CST">CST (UTC-6)</option>
                      <option value="PST">PST (UTC-8)</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-6">
              Note: Scheduled stories may experience a delay of up to 5 minutes before publishing.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-600 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSchedule}
                disabled={isScheduling || !scheduleDate || !scheduleTime}
                className="px-5 py-2.5 rounded-xl bg-teal-600 text-sm font-medium text-white hover:bg-teal-500 transition-colors disabled:opacity-50"
              >
                {isScheduling ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Story history overlay */}
      {showHistory && story && (
        <StoryHistoryPanel
          spaceId={spaceId}
          storyId={story.id}
          storyName={story.name}
          previewUrl={fullPreviewUrl || undefined}
          onClose={() => setShowHistory(false)}
          onRestore={() => { setStory(null); router.refresh() }}
        />
      )}

      {/* Field discussion panel overlay */}
      {activeDiscussionField && story && (
        <FieldDiscussionPanel
          spaceId={spaceId}
          storyId={story.id}
          fieldKey={activeDiscussionField}
          fieldLabel={activeDiscussionField}
          targetRect={activeDiscussionRect}
          onClose={() => { setActiveDiscussionField(null); setActiveDiscussionRect(null) }}
          onDiscussionChange={refreshDiscussionCounts}
        />
      )}
    </div>
  )
}

function SkeletonFields({ rows, tall = false }: { rows: number[]; tall?: boolean }) {
  return (
    <div className="px-5 py-5 space-y-6 overflow-y-auto flex-1">
      <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      {rows.map((w, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ width: `${w}%` }} />
          <div className={`w-full bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse ${tall ? 'h-10' : 'h-9'}`} />
        </div>
      ))}
    </div>
  )
}
