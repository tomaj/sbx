'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Link2,
  ExternalLink,
  Folder,
  RefreshCcw,
  Trash2,
  X,
  Wand2,
  ImageIcon,
} from 'lucide-react'
import { AssetThumb } from './asset-thumb'
import { TagsMultiselect } from '@/components/ui/tags-multiselect'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { DateField } from '@/components/ui/date-field'
import { formatDate } from '@/lib/date'
import type { Asset } from './asset-grid'

const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL ?? 'http://localhost:3002'

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}

function formatExt(contentType: string): string {
  const parts = contentType.split('/')
  return `.${parts[1] ?? parts[0] ?? ''}`
}

function assetPublicUrl(filename: string): string {
  const match = filename.match(/\/f\/\d+\/(.+)$/)
  if (!match) return filename
  const spaceMatch = filename.match(/\/f\/(\d+)\//)
  return `${CDN_URL}/f/${spaceMatch?.[1]}/${match[1]}`
}

interface AssetDetailModalProps {
  asset: Asset
  spaceId: string
  onClose: () => void
  onDeleted: (asset: Asset) => void
  onSaved: (asset: Asset) => void
}

export function AssetDetailModal({ asset: initialAsset, spaceId, onClose, onDeleted, onSaved }: AssetDetailModalProps) {
  const [tab, setTab] = useState<'overview' | 'references'>('overview')
  const [asset, setAsset] = useState<Asset>(initialAsset)

  // Fetch fresh asset data on open (like Storyblok does) — ref guards against StrictMode double-invoke
  const fetchedRef = useRef(false)
  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    fetch(`/api/admin/spaces/${spaceId}/assets/${initialAsset.id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.asset) setAsset(data.asset) })
      .catch(() => {})
  }, [spaceId, initialAsset.id])

  // Form state
  const [title, setTitle] = useState(asset.title ?? '')
  const [alt, setAlt] = useState(asset.alt ?? '')
  const [copyright, setCopyright] = useState((asset as any).copyright ?? '')
  const [source, setSource] = useState((asset as any).meta_data?.source ?? '')
  const [expireAt, setExpireAt] = useState(
    (asset as any).expire_at ? new Date((asset as any).expire_at).toISOString().slice(0, 10) : '',
  )
  const [locked, setLocked] = useState((asset as any).locked ?? false)
  const [internalTags, setInternalTags] = useState<{ id: number; name: string }[]>(
    (asset as any).internal_tags_list ?? [],
  )

  // Sync form state when fresh asset data arrives
  useEffect(() => {
    setTitle(asset.title ?? '')
    setAlt(asset.alt ?? '')
    setCopyright((asset as any).copyright ?? '')
    setSource((asset as any).meta_data?.source ?? '')
    setExpireAt((asset as any).expire_at ? new Date((asset as any).expire_at).toISOString().slice(0, 10) : '')
    setLocked((asset as any).locked ?? false)
    setInternalTags((asset as any).internal_tags_list ?? [])
  }, [asset])

  // References state
  const [referenceStories, setReferenceStories] = useState<any[]>([])
  const [referencesTotal, setReferencesTotal] = useState(0)
  const [referencesLoading, setReferencesLoading] = useState(false)
  const [referencesLoaded, setReferencesLoaded] = useState(false)

  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ title?: string; alt?: string }>({})
  const [copied, setCopied] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [generatingAlt, setGeneratingAlt] = useState(false)
  const [showEditorTodo, setShowEditorTodo] = useState(false)
  const [showMoveTodo, setShowMoveTodo] = useState(false)
  const replaceInputRef = useRef<HTMLInputElement>(null)

  // Dimensions from meta_data
  const width = (asset as any).meta_data?.width
  const height = (asset as any).meta_data?.height

  const isImage = asset.content_type.startsWith('image/')

  // Folder breadcrumb: just show asset_folder_id for now
  const folderLabel = asset.asset_folder_id ? `Folder ${asset.asset_folder_id}` : null

  // Fetch story references when tab switches to 'references'
  useEffect(() => {
    if (tab !== 'references' || referencesLoaded) return
    setReferencesLoading(true)
    const qs = new URLSearchParams()
    qs.set('reference_search[]', asset.filename)
    qs.set('per_page', '25')
    fetch(`/api/admin/spaces/${spaceId}/stories?${qs}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.stories) setReferenceStories(data.stories)
        if (data?.total !== undefined) setReferencesTotal(data.total)
        setReferencesLoaded(true)
      })
      .catch(() => setReferencesLoaded(true))
      .finally(() => setReferencesLoading(false))
  }, [tab, referencesLoaded, spaceId, asset.filename])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleGenerateAltText() {
    setGeneratingAlt(true)
    setErrors((prev) => ({ ...prev, alt: undefined }))
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/assets/${asset.id}/ai/alt-text`, {
        method: 'POST',
      })
      if (res.ok) {
        const data = await res.json()
        if (data.alt_text) setAlt(data.alt_text)
      } else {
        const data = await res.json().catch(() => ({}))
        setErrors((prev) => ({ ...prev, alt: data.message ?? 'Failed to generate alt text' }))
      }
    } catch {
      setErrors((prev) => ({ ...prev, alt: 'Failed to generate alt text' }))
    } finally {
      setGeneratingAlt(false)
    }
  }

  async function handleSave() {
    const newErrors: { title?: string; alt?: string } = {}
    if (!title.trim()) newErrors.title = 'Title/Caption is required'
    if (!alt.trim()) newErrors.alt = 'Alt text is required'
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setErrors({})
    setSaving(true)
    try {
      const meta_data = {
        ...((asset as any).meta_data ?? {}),
        source: source || undefined,
      }
      const res = await fetch(`/api/admin/spaces/${spaceId}/assets/${asset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || null,
          alt: alt || null,
          copyright: copyright || null,
          expire_at: expireAt || null,
          locked,
          meta_data,
          internal_tag_ids: internalTags.map((t) => t.id),
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        onSaved({ ...asset, ...updated })
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const res = await fetch(`/api/admin/spaces/${spaceId}/assets/${asset.id}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      onDeleted(asset)
      onClose()
    }
  }

  async function handleReplace(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`/api/admin/spaces/${spaceId}/assets/${asset.id}/replace`, {
      method: 'POST',
      body: fd,
    })
    if (res.ok) {
      const updated = await res.json()
      onSaved({ ...asset, ...updated })
    }
    // reset input
    if (replaceInputRef.current) replaceInputRef.current.value = ''
  }

  function copyUrl() {
    const url = assetPublicUrl(asset.filename)
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function openInNewWindow() {
    window.open(assetPublicUrl(asset.filename), '_blank')
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* ── Left: Preview ─────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              {folderLabel && (
                <p className="text-xs text-gray-400 mb-0.5">in {folderLabel}/</p>
              )}
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                    {asset.short_filename || asset.filename.split('/').pop()}
                  </h2>
                  <p className="text-sm text-gray-400">{formatExt(asset.content_type)}</p>
                </div>
                {isImage && (
                  <button
                    onClick={() => setShowEditorTodo(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Open image editor
                  </button>
                )}
              </div>
            </div>

            {/* Image preview */}
            <div className="flex-1 flex items-center justify-center overflow-hidden bg-[length:20px_20px] bg-[position:0_0,10px_10px]"
              style={{
                backgroundImage: isImage
                  ? 'linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(135deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(135deg,transparent 75%,#e5e7eb 75%)'
                  : undefined,
                backgroundColor: isImage ? '#f9fafb' : '#f3f4f6',
              }}
            >
              <div className="flex items-center justify-center w-full h-full p-6">
                <AssetThumb
                  filename={asset.filename}
                  contentType={asset.content_type}
                  spaceId={spaceId}
                  alt={asset.alt}
                  size={1200}
                  imgClassName="max-w-full max-h-full w-auto h-auto object-contain"
                  iconClassName="w-24 h-24 text-gray-400"
                />
              </div>
            </div>

            {/* Footer: dimensions / size / format */}
            <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-8 text-sm">
              <div>
                <span className="text-gray-400 text-xs block">Width &amp; Height</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {(width && height) ? `${width} x ${height}` : '—'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 text-xs block">Size</span>
                <span className="text-gray-700 dark:text-gray-300">{formatBytes(asset.content_length)}</span>
              </div>
              <div>
                <span className="text-gray-400 text-xs block">Format</span>
                <span className="text-gray-700 dark:text-gray-300">{formatExt(asset.content_type)}</span>
              </div>
            </div>
          </div>

          {/* ── Right: Form ────────────────────────────────────────────────── */}
          <div className="w-96 shrink-0 flex flex-col">
            {/* Top icons */}
            <div className="flex items-center justify-end gap-1 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <input
                ref={replaceInputRef}
                type="file"
                className="hidden"
                onChange={handleReplace}
              />
              <button
                title={copied ? 'Copied!' : 'Copy URL'}
                onClick={copyUrl}
                className={`p-2 rounded-lg transition-colors ${copied ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-600' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300'}`}
              >
                <Link2 className="w-4 h-4" />
              </button>
              <button title="Open in new window" onClick={openInNewWindow} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <ExternalLink className="w-4 h-4" />
              </button>
              <button title="Move to folder" onClick={() => setShowMoveTodo(true)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <Folder className="w-4 h-4" />
              </button>
              <button title="Replace asset" onClick={() => replaceInputRef.current?.click()} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <RefreshCcw className="w-4 h-4" />
              </button>
              <button title="Delete" onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
              <button title="Close" onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 px-4">
              {(['overview', 'references'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`py-3 px-1 mr-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    tab === t
                      ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {tab === 'overview' ? (
                <div className="px-5 py-4 flex flex-col gap-4">
                  {/* Title/Caption */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Title/Caption <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => { setTitle(e.target.value); setErrors(prev => ({ ...prev, title: undefined })) }}
                      className={`w-full px-3 py-2 border rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 ${errors.title ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-gray-700 focus:ring-teal-500 focus:border-teal-500'}`}
                    />
                    {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
                  </div>

                  {/* Alt text */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Alt text <span className="text-red-500">*</span>
                      </label>
                      {isImage && (
                        <button
                          onClick={handleGenerateAltText}
                          disabled={generatingAlt}
                          className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Wand2 className="w-3 h-3" />
                          {generatingAlt ? 'Generating...' : 'Generate Alt Text'}
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={alt}
                      disabled={generatingAlt}
                      onChange={e => { setAlt(e.target.value); setErrors(prev => ({ ...prev, alt: undefined })) }}
                      className={`w-full px-3 py-2 border rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed ${errors.alt ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-gray-700 focus:ring-teal-500 focus:border-teal-500'}`}
                    />
                    {errors.alt ? (
                      <p className="mt-1 text-xs text-red-500">{errors.alt}</p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-400">Review AI-generated text for accuracy.</p>
                    )}
                  </div>

                  {/* Asset ID */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asset ID</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 select-all">{asset.id}</p>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
                    <TagsMultiselect
                      spaceId={spaceId}
                      objectType="asset"
                      value={internalTags}
                      onChange={setInternalTags}
                    />
                  </div>

                  {/* Private asset */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Private asset</p>
                      <p className="text-xs text-gray-400 mt-0.5">Private assets are not available to the public and can only be accessed via an access token.</p>
                    </div>
                    <button
                      onClick={() => setLocked(!locked)}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${locked ? 'bg-teal-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${locked ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* Expiration date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiration date</label>
                    <DateField
                      value={expireAt}
                      onChange={setExpireAt}
                      placeholder="Expiration date (YYYY-MM-DD)"
                    />
                  </div>

                  {/* Copyright */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Copyright</label>
                    <input
                      type="text"
                      value={copyright}
                      onChange={e => setCopyright(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>

                  {/* Source */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Source</label>
                    <input
                      type="text"
                      value={source}
                      onChange={e => setSource(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="px-5 py-4">
                  {referencesLoading ? (
                    <div className="space-y-3 mt-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800">
                          <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Used in: {referencesTotal} {referencesTotal === 1 ? 'story' : 'stories'}
                      </p>
                      {referenceStories.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No stories reference this asset.</p>
                      ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                          {referenceStories.map((story) => (
                            <div key={story.id} className="flex items-center gap-3 py-3">
                              <div className="w-5 h-5 rounded-full border-2 border-teal-500 flex items-center justify-center shrink-0">
                                <div className="w-2 h-2 rounded-full bg-teal-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{story.name}</p>
                                <p className="text-xs text-gray-400 truncate">/{story.full_slug}</p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-xs text-gray-400">
                                  {story.updated_at ? formatDate(story.updated_at) : ''}
                                </p>
                              </div>
                              <a
                                href={`/spaces/${spaceId}/content/${story.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save & Close'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirm */}
      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete Asset"
        message={`Are you sure you want to delete "${asset.short_filename || asset.filename.split('/').pop()}"?`}
        confirmLabel="Delete"
        dangerous
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Image editor — coming soon */}
      {showEditorTodo && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center" onClick={() => setShowEditorTodo(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Image Editor</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">The image editor is not available yet. This feature is planned for a future release.</p>
            <div className="flex justify-end">
              <button onClick={() => setShowEditorTodo(false)} className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700">OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Move to folder — coming soon */}
      {showMoveTodo && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center" onClick={() => setShowMoveTodo(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Move to Folder</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Moving assets to folders is not available yet. This feature is coming soon.</p>
            <div className="flex justify-end">
              <button onClick={() => setShowMoveTodo(false)} className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700">OK</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
