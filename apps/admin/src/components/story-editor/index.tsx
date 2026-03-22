'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Globe, History, ChevronDown,
  Pencil, Info, Diamond, MessageSquare, SlidersHorizontal,
  Monitor, FileText, Layers, LayoutList,
  Smartphone, Maximize2, Settings, ExternalLink,
} from 'lucide-react'
import { EditTab } from './edit-tab'
import { InfoTab } from './info-tab'
import { ConfigTab } from './config-tab'
import { LayersPanel } from './layers-panel'
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
  const [showPreview, setShowPreview] = useState(true)
  const [activeLeftPanel, setActiveLeftPanel] = useState<LeftPanel>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('desktop')
  const previewStorageKey = `sbx-preview-url-${spaceId}`
  const [selectedPreviewKey, setSelectedPreviewKey] = useState<string>(
    () => (typeof window !== 'undefined' ? (localStorage.getItem(previewStorageKey) ?? 'domain') : 'domain')
  )
  const [showPreviewMenu, setShowPreviewMenu] = useState(false)
  const [mobileViewWidth, setMobileViewWidth] = useState(mobileWidth)

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
    ? selectedPreviewBase.replace(/\/$/, '') + '/' + story.full_slug + (previewParams ? '?' + previewParams : '')
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
      const res = await fetch(`/api/admin/spaces/${spaceId}/stories/${story.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
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

  async function handleConfigSave(data: Partial<StoryDetail>) {
    if (!story) return
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/stories/${story.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
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
          onClick={() => router.push(`/spaces/${spaceId}/content`)}
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
              <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                <button
                  type="button"
                  onClick={handlePublish}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Publish
                </button>
                {story?.published && (
                  <button
                    type="button"
                    onClick={handleUnpublish}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Unpublish
                  </button>
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

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-14 flex flex-col items-center py-3 gap-1 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowPreview(p => !p)}
            title={showPreview ? 'Switch to Form' : 'Switch to Visual'}
            className="flex flex-col items-center gap-0.5 w-full py-2 px-1 rounded-lg transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            {showPreview ? <FileText className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
            <span className="text-[10px] font-medium">{showPreview ? 'Form' : 'Visual'}</span>
          </button>

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
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Comments — coming soon</p>
                  </div>
                </div>
              )}
              {activePanel === 'config' && (
                story
                  ? <ConfigTab story={story} onSave={handleConfigSave} />
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
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
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
