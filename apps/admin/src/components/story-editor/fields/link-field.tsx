'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Image, AtSign, Link2, Globe, ChevronDown, ChevronRight, Search, Folder, ExternalLink, X, TriangleAlert } from 'lucide-react'
import type { LinkFieldDef, MultilinkFieldDef } from '@/components/block-library/edit-block-modal/types'
import { fieldLabel } from '../field-label'
import { FieldLabel } from '../FieldLabel'
import { AssetPickerModal } from '@/components/assets/asset-picker-modal'
import { AssetThumb } from '@/components/assets/asset-thumb'
import type { Asset } from '@/components/assets/asset-grid'
import { normalizeAssetFilename } from '@/lib/utils'
import { StoryStatusIcon } from '@/components/stories/story-status-icon'

interface LinkValue {
  linktype?: 'url' | 'story' | 'email' | 'asset'
  url?: string
  href?: string
  cached_url?: string
  target?: '_blank' | '_self'
  anchor?: string
  id?: string
}

interface StoryItem {
  id: number
  uuid: string
  name: string
  full_slug: string
  is_folder: boolean
  published: boolean
  unpublished_changes: boolean
}

interface BreadcrumbEntry {
  id: number
  name: string
}

interface Props {
  fieldKey: string
  def: LinkFieldDef | MultilinkFieldDef
  value: LinkValue | undefined
  onChange: (v: LinkValue) => void
  spaceId: string
}

type LinkType = 'url' | 'story' | 'email' | 'asset'

const LINK_TYPES: { type: LinkType; label: string; Icon: React.ElementType }[] = [
  { type: 'asset', label: 'Asset', Icon: Image },
  { type: 'email', label: 'Email', Icon: AtSign },
  { type: 'story', label: 'Internal link', Icon: Link2 },
  { type: 'url', label: 'URL', Icon: Globe },
]

function getAvailableTypes(def: LinkFieldDef | MultilinkFieldDef): LinkType[] {
  return LINK_TYPES
    .filter((t) => {
      if (t.type === 'asset') return def.asset_link_type !== false
      if (t.type === 'email') return def.email_link_type !== false
      return true
    })
    .map((t) => t.type)
}

export function LinkField({ fieldKey, def, value, onChange, spaceId }: Props) {
  const available = getAvailableTypes(def)
  const linktype: LinkType = (value?.linktype as LinkType | undefined) ?? 'url'
  const allowTarget = def.allow_target_blank ?? false

  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false)
  const [assetPickerOpen, setAssetPickerOpen] = useState(false)
  const [storyPanelOpen, setStoryPanelOpen] = useState(false)
  const [storySearch, setStorySearch] = useState('')
  const [stories, setStories] = useState<StoryItem[]>([])
  const [storiesLoading, setStoriesLoading] = useState(false)
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbEntry[]>([])
  const currentParentId = breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].id : null
  const [selectedStoryName, setSelectedStoryName] = useState<string>('')
  const [selectedStoryPublished, setSelectedStoryPublished] = useState<boolean | null>(null)
  const [selectedStoryId, setSelectedStoryId] = useState<number | null>(null)

  const typeDropdownRef = useRef<HTMLDivElement>(null)
  const storyPanelRef = useRef<HTMLDivElement>(null)

  function update(patch: Partial<LinkValue>) {
    onChange({ ...(value ?? {}), ...patch })
  }

  function selectType(t: LinkType) {
    setTypeDropdownOpen(false)
    setBreadcrumb([])
    setStorySearch('')
    setStoryPanelOpen(false)
    setSelectedStoryName('')
    setSelectedStoryPublished(null)
    setSelectedStoryId(null)
    onChange({ linktype: t, url: '', href: '', cached_url: '', id: '', target: value?.target })
  }

  function clearStory() {
    setSelectedStoryName('')
    setSelectedStoryPublished(null)
    setSelectedStoryId(null)
    onChange({ linktype: 'story', url: '', href: '', cached_url: '', id: '', target: value?.target })
  }

  // Close type dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
        setTypeDropdownOpen(false)
      }
    }
    if (typeDropdownOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [typeDropdownOpen])

  // Close story panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (storyPanelRef.current && !storyPanelRef.current.contains(e.target as Node)) {
        setStoryPanelOpen(false)
      }
    }
    if (storyPanelOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [storyPanelOpen])

  // Fetch stories for internal link browser
  const fetchStories = useCallback(() => {
    const controller = new AbortController()
    setStoriesLoading(true)
    const params = new URLSearchParams({ per_page: '50' })
    if (storySearch.trim()) {
      params.set('text_search', storySearch.trim())
    } else {
      params.set('parent_id', currentParentId !== null ? String(currentParentId) : '')
    }
    fetch(`/api/admin/spaces/${spaceId}/stories?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        setStories(data.stories ?? [])
        setStoriesLoading(false)
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') setStoriesLoading(false)
      })
    return () => controller.abort()
  }, [spaceId, storySearch, currentParentId])

  useEffect(() => {
    if (!storyPanelOpen) return
    const cleanup = fetchStories()
    return cleanup
  }, [storyPanelOpen, fetchStories])

  function handleAssetSelect(assets: Asset[]) {
    const asset = assets[0]
    if (!asset) return
    const url = normalizeAssetFilename(asset.filename)
    update({ linktype: 'asset', url, href: url, cached_url: url, id: String(asset.id) })
    setAssetPickerOpen(false)
  }

  function handleStorySelect(story: StoryItem) {
    if (story.is_folder) {
      setBreadcrumb((prev) => [...prev, { id: story.id, name: story.name }])
      setStorySearch('')
    } else {
      update({
        linktype: 'story',
        id: story.uuid,
        url: story.full_slug,
        href: story.full_slug,
        cached_url: story.full_slug,
      })
      setSelectedStoryName(story.name)
      setSelectedStoryPublished(story.published)
      setSelectedStoryId(story.id)
      setStoryPanelOpen(false)
      setBreadcrumb([])
      setStorySearch('')
    }
  }

  function navigateBreadcrumb(index: number) {
    if (index < 0) {
      setBreadcrumb([])
    } else {
      setBreadcrumb((prev) => prev.slice(0, index + 1))
    }
    setStorySearch('')
  }

  const currentType = LINK_TYPES.find((t) => t.type === linktype)
  const CurrentIcon = currentType?.Icon ?? Globe

  const displayUrl = value?.cached_url || value?.url || value?.href || ''
  const assetUrl = linktype === 'asset' ? displayUrl : ''
  const assetShortName = assetUrl.split('/').pop() ?? ''
  const selectedStorySlug = linktype === 'story' ? displayUrl : ''
  const storyIsUnpublished = linktype === 'story' && selectedStorySlug && selectedStoryPublished === false

  return (
    <div>
      <FieldLabel label={fieldLabel(def.display_name, fieldKey)} required={def.required} description={def.description} />

      {/* Main input row */}
      <div className="group/input flex items-stretch border border-gray-300 dark:border-gray-600 rounded-lg overflow-visible bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500">

        {/* Type selector */}
        <div className="relative flex-shrink-0" ref={typeDropdownRef}>
          <button
            type="button"
            onClick={() => setTypeDropdownOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 h-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border-r border-gray-200 dark:border-gray-700 transition-colors"
          >
            <CurrentIcon className="w-4 h-4" />
            <ChevronDown className="w-3 h-3" />
          </button>

          {typeDropdownOpen && (
            <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 min-w-[160px]">
              {LINK_TYPES.filter((t) => available.includes(t.type)).map(({ type, label, Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => selectType(type)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    type === linktype ? 'text-teal-600 dark:text-teal-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* URL input — editable */}
        {(linktype === 'url' || linktype === 'email') && (
          <input
            type={linktype === 'email' ? 'email' : 'url'}
            placeholder={linktype === 'email' ? 'email@example.com' : 'https://'}
            value={displayUrl}
            onChange={(e) => update({ url: e.target.value, href: e.target.value, cached_url: e.target.value })}
            className="flex-1 px-3 py-2 text-sm bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none min-w-0"
          />
        )}

        {/* Asset — disabled URL display */}
        {linktype === 'asset' && (
          <input
            type="text"
            disabled
            value={displayUrl}
            placeholder="Select an asset below..."
            className="flex-1 px-3 py-2 text-sm bg-transparent text-gray-500 dark:text-gray-400 placeholder-gray-400 focus:outline-none min-w-0 cursor-default"
          />
        )}

        {/* Internal link — content area */}
        {linktype === 'story' && (
          <div className="flex-1 flex items-center min-w-0">
            {/* Warning icon when unpublished */}
            {storyIsUnpublished && (
              <TriangleAlert className="w-4 h-4 text-amber-500 flex-shrink-0 ml-3" />
            )}

            {/* Text content — click opens browser */}
            <button
              type="button"
              onClick={() => setStoryPanelOpen((v) => !v)}
              className="flex-1 px-3 py-1.5 text-sm text-left min-w-0"
            >
              {selectedStorySlug ? (
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
                    {selectedStoryName || selectedStorySlug.split('/').pop()}
                  </p>
                  <p className="text-xs text-gray-400 truncate leading-tight mt-0.5">{selectedStorySlug}</p>
                </div>
              ) : (
                <span className="text-gray-400">Internal link</span>
              )}
            </button>

            {/* Hover actions */}
            {selectedStorySlug ? (
              <div className="flex items-center flex-shrink-0 opacity-0 group-hover/input:opacity-100 transition-opacity border-l border-gray-200 dark:border-gray-700">
                <a
                  href={selectedStoryId ? `/spaces/${spaceId}/content/${selectedStoryId}` : '#'}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Open story"
                  className="flex items-center justify-center w-9 h-full text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={clearStory}
                  title="Clear selection"
                  className="flex items-center justify-center w-9 h-full text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors border-l border-gray-200 dark:border-gray-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setStoryPanelOpen((v) => !v)}
                  title="Change selection"
                  className="flex items-center justify-center w-9 h-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors border-l border-gray-200 dark:border-gray-700"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setStoryPanelOpen((v) => !v)}
                className="flex items-center justify-center w-9 h-full flex-shrink-0 text-gray-400"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Unpublished story warning */}
      {storyIsUnpublished && (
        <div className="mt-1.5 flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-400/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-500/40">
          <TriangleAlert className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Unpublished linked story</span>
        </div>
      )}

      {/* Asset card — shown below input, click opens picker */}
      {linktype === 'asset' && (
        <div className="mt-2">
          {assetUrl ? (
            <button
              type="button"
              onClick={() => setAssetPickerOpen(true)}
              className="w-full flex items-center gap-3 border border-gray-200 dark:border-gray-700 rounded-xl p-2 bg-white dark:bg-gray-900 hover:border-teal-400 hover:bg-teal-50/30 dark:hover:bg-teal-900/10 transition-colors text-left"
            >
              <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                <AssetThumb
                  filename={assetUrl}
                  contentType={
                    /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(assetUrl) ? 'image/jpeg'
                    : /\.svg$/i.test(assetUrl) ? 'image/svg+xml'
                    : 'application/octet-stream'
                  }
                  spaceId={spaceId}
                  size={120}
                  imgClassName="w-full h-full object-cover"
                  iconClassName="w-6 h-6 text-gray-400"
                />
              </div>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{assetShortName}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAssetPickerOpen(true)}
              className="w-full flex items-center gap-3 border border-gray-200 dark:border-gray-700 rounded-xl p-2 bg-white dark:bg-gray-900 hover:border-teal-400 hover:bg-teal-50/30 dark:hover:bg-teal-900/10 transition-colors text-left"
            >
              <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <Image className="w-6 h-6 text-gray-400" />
              </div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">+ Add Asset</span>
            </button>
          )}
        </div>
      )}

      {/* Open in new window toggle */}
      {allowTarget && (
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Open in new window</span>
          <button
            type="button"
            role="switch"
            aria-checked={value?.target === '_blank'}
            onClick={() => update({ target: value?.target === '_blank' ? '_self' : '_blank' })}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
              value?.target === '_blank' ? 'bg-teal-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                value?.target === '_blank' ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      )}

      {/* Internal link story browser */}
      {linktype === 'story' && storyPanelOpen && (
        <div
          ref={storyPanelRef}
          className="mt-1 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 shadow-lg overflow-hidden"
        >
          {/* Search */}
          <div className="p-2 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500">
              <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <input
                autoFocus
                type="text"
                value={storySearch}
                onChange={(e) => setStorySearch(e.target.value)}
                placeholder="Search for content items"
                className="flex-1 text-sm bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Breadcrumb */}
          {!storySearch && breadcrumb.length > 0 && (
            <div className="flex items-center gap-1 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 flex-wrap">
              <button
                type="button"
                onClick={() => navigateBreadcrumb(-1)}
                className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
              >
                Root
              </button>
              {breadcrumb.map((entry, i) => (
                <span key={entry.id} className="flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 text-gray-300 dark:text-gray-600" />
                  {i < breadcrumb.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => navigateBreadcrumb(i)}
                      className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                    >
                      {entry.name}
                    </button>
                  ) : (
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{entry.name}</span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Story / folder list */}
          <div className="max-h-56 overflow-y-auto">
            {storiesLoading && Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/5" />
                  <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-3/5" />
                </div>
              </div>
            ))}
            {!storiesLoading && stories.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-gray-400">No content items found</div>
            )}
            {!storiesLoading && stories.map((story) => (
              <button
                key={story.id}
                type="button"
                onClick={() => handleStorySelect(story)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                  value?.id === story.uuid ? 'bg-teal-50 dark:bg-teal-900/20' : ''
                }`}
              >
                {story.is_folder
                  ? <Folder className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  : <StoryStatusIcon published={story.published} unpublishedChanges={story.unpublished_changes} />
                }
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{story.name}</p>
                  <p className="text-xs text-gray-400 truncate">{story.full_slug}</p>
                </div>
                {story.is_folder && (
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Asset picker modal */}
      {assetPickerOpen && (
        <AssetPickerModal
          spaceId={spaceId}
          mode="single"
          onSelect={handleAssetSelect}
          onClose={() => setAssetPickerOpen(false)}
        />
      )}
    </div>
  )
}
