'use client'

import { useState, useEffect, use } from 'react'
import { Check, Trash2, Plus, Minus } from 'lucide-react'

interface PreviewUrl {
  name: string
  location: string
}

interface VisualEditorSettings {
  domain: string
  previewUrls: PreviewUrl[]
  encodeUrl: boolean
  mobileWidth: number
  visualEditorDisabled: boolean
}

function SettingsSection({ title, description, children }: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 pb-8 mb-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h2>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{description}</p>
      )}
      {!description && <div className="mb-5" />}
      {children}
    </div>
  )
}

export default function VisualEditorPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params)

  const [settings, setSettings] = useState<VisualEditorSettings>({
    domain: '',
    previewUrls: [],
    encodeUrl: false,
    mobileWidth: 360,
    visualEditorDisabled: false,
  })

  const [newPreview, setNewPreview] = useState({ name: '', location: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/spaces/${spaceId}/space`)
      .then((r) => r.json())
      .then((data) => {
        if (data.space) {
          const s = data.space
          setSettings({
            domain: s.domain ?? '',
            previewUrls: s.preview_urls ?? [],
            encodeUrl: s.encode_url ?? false,
            mobileWidth: s.mobile_width ?? 360,
            visualEditorDisabled: s.visual_editor_disabled ?? false,
          })
        }
      })
  }, [spaceId])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/space`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: settings.domain || null,
          preview_urls: settings.previewUrls,
          encode_url: settings.encodeUrl,
          mobile_width: settings.mobileWidth,
          visual_editor_disabled: settings.visualEditorDisabled,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message ?? 'Failed to save')
      }
      const data = await res.json()
      if (data.space) {
        const s = data.space
        setSettings({
          domain: s.domain ?? '',
          previewUrls: s.preview_urls ?? [],
          encodeUrl: s.encode_url ?? false,
          mobileWidth: s.mobile_width ?? 360,
          visualEditorDisabled: s.visual_editor_disabled ?? false,
        })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function addPreviewUrl() {
    if (!newPreview.name.trim() || !newPreview.location.trim()) return
    setSettings((s) => ({ ...s, previewUrls: [...s.previewUrls, { name: newPreview.name.trim(), location: newPreview.location.trim() }] }))
    setNewPreview({ name: '', location: '' })
  }

  function removePreviewUrl(index: number) {
    setSettings((s) => ({ ...s, previewUrls: s.previewUrls.filter((_, i) => i !== index) }))
  }

  function updatePreviewUrl(index: number, field: 'name' | 'location', value: string) {
    setSettings((s) => ({
      ...s,
      previewUrls: s.previewUrls.map((p, i) => i === index ? { ...p, [field]: value } : p),
    }))
  }

  return (
    <div className="max-w-2xl px-10 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Visual Editor</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <Check className="w-4 h-4" />
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
        </button>
      </div>

      {error && (
        <p className="mb-5 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Location */}
      <SettingsSection title="">
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Location (default environment) <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={settings.domain}
            onChange={(e) => setSettings((s) => ({ ...s, domain: e.target.value }))}
            placeholder="https://example.com"
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <p className="mt-2 text-xs text-gray-400">
            This is the page that the frontend editor opens. Insert your domain/location including the protocol. Example: http://www.example.com
          </p>
        </div>
      </SettingsSection>

      {/* Preview URLs */}
      <SettingsSection
        title="Preview URLs"
        description="Define multiple domains/locations to quickly switch the preview URLs in the story editor."
      >
        {/* Encode URL */}
        <div className="mb-5">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Encode Preview URLs</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            With this configuration, the URL sent to the iframe will be encoded, meaning that attributes such as [ and ] will be changed to %5B and %5D.
          </p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.encodeUrl}
              onChange={(e) => setSettings((s) => ({ ...s, encodeUrl: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Encode URL</span>
          </label>
        </div>

        {/* Add new row */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newPreview.name}
            onChange={(e) => setNewPreview((p) => ({ ...p, name: e.target.value }))}
            placeholder="Name (e.g. Live, Dev)"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <input
            type="url"
            value={newPreview.location}
            onChange={(e) => setNewPreview((p) => ({ ...p, location: e.target.value }))}
            placeholder="Location (e.g. http://www.yoursite.com)"
            onKeyDown={(e) => e.key === 'Enter' && addPreviewUrl()}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            onClick={addPreviewUrl}
            disabled={!newPreview.name.trim() || !newPreview.location.trim()}
            className="px-3 py-2 text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Existing rows */}
        {settings.previewUrls.map((p, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              type="text"
              value={p.name}
              onChange={(e) => updatePreviewUrl(i, 'name', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <input
              type="url"
              value={p.location}
              onChange={(e) => updatePreviewUrl(i, 'location', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              onClick={() => removePreviewUrl(i)}
              className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </SettingsSection>

      {/* Responsive view */}
      <SettingsSection
        title="Responsive view"
        description="Change default mobile and tablet responsive size of your Visual Editor"
      >
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Mobile width in px</p>
          <div className="flex items-center gap-0 w-40">
            <button
              onClick={() => setSettings((s) => ({ ...s, mobileWidth: Math.max(240, s.mobileWidth - 10) }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="number"
              value={settings.mobileWidth}
              onChange={(e) => setSettings((s) => ({ ...s, mobileWidth: Math.max(240, parseInt(e.target.value) || 360) }))}
              className="flex-1 px-3 py-2 border-y border-gray-300 dark:border-gray-600 text-sm text-center text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 w-16"
            />
            <button
              onClick={() => setSettings((s) => ({ ...s, mobileWidth: Math.min(1920, s.mobileWidth + 10) }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-r-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </SettingsSection>

      {/* Visual Editor Mode */}
      <div className="pb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Visual Editor Mode</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Disable Visual Editor for this project and users will only be able to use form-only mode
        </p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.visualEditorDisabled}
            onChange={(e) => setSettings((s) => ({ ...s, visualEditorDisabled: e.target.checked }))}
            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Disable Visual Editor</span>
        </label>
      </div>
    </div>
  )
}
