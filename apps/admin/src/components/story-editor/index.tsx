'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Globe, History, Save, ChevronDown,
  Pencil, Info, Diamond, MessageSquare, SlidersHorizontal,
} from 'lucide-react'
import { EditTab } from './edit-tab'
import { InfoTab } from './info-tab'
import { ConfigTab } from './config-tab'
import type { ComponentMeta, ComponentGroup, StoryDetail } from './types'

interface Props {
  spaceId: string
  story: StoryDetail
  componentSchema: Record<string, any> | null
  allComponents: ComponentMeta[]
  allGroups: ComponentGroup[]
}

type PanelTab = 'edit' | 'info' | 'workflow' | 'comment' | 'config'

const PANEL_TABS: { id: PanelTab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'edit',     label: 'Edit',     Icon: Pencil },
  { id: 'info',     label: 'Info',     Icon: Info },
  { id: 'workflow', label: 'Workflow', Icon: Diamond },
  { id: 'comment',  label: 'Comment',  Icon: MessageSquare },
  { id: 'config',   label: 'Config',   Icon: SlidersHorizontal },
]

function PublishStatus({ story }: { story: StoryDetail }) {
  if (story.published && !story.unpublished_changes) {
    return <span className="w-3 h-3 rounded-full bg-teal-500 inline-block" title="Published" />
  }
  if (story.published && story.unpublished_changes) {
    return <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" title="Published (unpublished changes)" />
  }
  return <span className="w-3 h-3 rounded-full border-2 border-gray-400 inline-block" title="Draft" />
}

export function StoryEditor({ spaceId, story: initialStory, componentSchema, allComponents, allGroups }: Props) {
  const router = useRouter()
  const [story, setStory] = useState<StoryDetail>(initialStory)
  const [content, setContent] = useState<Record<string, any>>(initialStory.content ?? {})
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [activePanel, setActivePanel] = useState<PanelTab>('edit')
  const [showPublishMenu, setShowPublishMenu] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFieldChange = useCallback((key: string, value: any) => {
    setContent((prev) => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }, [])

  async function save(): Promise<StoryDetail | null> {
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
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{story.name}</h1>
          <p className="text-xs text-gray-400 truncate">{story.full_slug}</p>
        </div>

        {/* Language selector (stub) */}
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
        >
          <Globe className="w-4 h-4" />
          Default
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </button>

        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
        >
          <History className="w-4 h-4" />
          History
        </button>

        {/* Publish status indicator */}
        <PublishStatus story={story} />

        {/* Save button */}
        <button
          type="button"
          onClick={() => save()}
          disabled={isSaving || !isDirty}
          className="px-4 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40 text-gray-700 dark:text-gray-300"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>

        {/* Publish button */}
        <div className="relative flex">
          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing}
            className="px-4 py-1.5 text-sm font-medium bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-l-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            {isPublishing ? 'Publishing...' : 'Publish'}
          </button>
          <button
            type="button"
            onClick={() => setShowPublishMenu(!showPublishMenu)}
            className="px-2 py-1.5 text-sm font-medium bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-r-lg border-l border-gray-700 dark:border-gray-300 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
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
                {story.published && (
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
        {/* Preview pane (left) */}
        <div className="flex-1 bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-r border-gray-200 dark:border-gray-700">
          <div className="text-center text-gray-400">
            <div className="w-16 h-16 mx-auto mb-3 bg-gray-200 dark:bg-gray-700 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium">Preview</p>
            <p className="text-xs mt-1">Coming soon</p>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-shrink-0" style={{ width: 520 }}>
          {/* Panel content */}
          <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700 overflow-hidden">
            {activePanel === 'edit' && (
              <EditTab
                spaceId={spaceId}
                schema={componentSchema}
                content={content}
                allComponents={allComponents}
                allGroups={allGroups}
                onChange={handleFieldChange}
              />
            )}
            {activePanel === 'info' && <InfoTab story={story} />}
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
              <ConfigTab story={story} onSave={handleConfigSave} />
            )}
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
