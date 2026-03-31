'use client'

import { useState, useEffect, use } from 'react'
import { Copy, Check } from 'lucide-react'
import { SelectDropdown } from '@/components/ui/select-dropdown'

interface Space {
  id: number
  uuid: string
  name: string
  domain: string
  default_root: string | null
}

interface ContentType {
  name: string
  display_name: string | null
}

function SettingsSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 pb-8 mb-8">
      {title && (
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-5">{title}</h2>
      )}
      {children}
    </div>
  )
}

export default function SpaceSettingsPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params)

  const [space, setSpace] = useState<Space | null>(null)
  const [name, setName] = useState('')
  const [defaultRoot, setDefaultRoot] = useState<string | null>(null)
  const [contentTypes, setContentTypes] = useState<ContentType[]>([])
  const [loadingTypes, setLoadingTypes] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/spaces/${spaceId}/space`)
      .then((r) => r.json())
      .then((data) => {
        if (data.space) {
          setSpace(data.space)
          setName(data.space.name)
          setDefaultRoot(data.space.default_root ?? null)
        }
      })

    // Fetch root components (content types) — large per_page, filter is_root client-side
    fetch(`/api/admin/spaces/${spaceId}/components?per_page=100`)
      .then((r) => r.json())
      .then((data) => {
        const roots: ContentType[] = (data.components ?? [])
          .filter((c: any) => c.is_root)
          .map((c: any) => ({ name: c.name, display_name: c.display_name }))
        setContentTypes(roots)
      })
      .finally(() => setLoadingTypes(false))
  }, [spaceId])

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/space`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, default_root: defaultRoot }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message ?? 'Failed to save')
      }
      const data = await res.json()
      if (data.space) {
        setSpace(data.space)
        setName(data.space.name)
        setDefaultRoot(data.space.default_root ?? null)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function handleCopy() {
    if (!space) return
    navigator.clipboard.writeText(String(space.id))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const contentTypeOptions = contentTypes.map((c) => ({
    value: c.name,
    label: c.display_name || c.name,
  }))

  return (
    <div className="max-w-2xl px-10 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Space</h1>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <Check className="w-4 h-4" />
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
        </button>
      </div>

      {error && (
        <p className="mb-5 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Space Name + ID */}
      <SettingsSection>
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Space Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <p className="mt-1 text-xs text-gray-400 text-right">{name.length}/100</p>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Space ID
            </label>
            <div className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
              <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                #{space?.id ?? '...'}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-teal-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">Provide this ID in your support tickets</p>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Server Location
            </label>
            <div className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
              <span className="text-sm text-gray-700 dark:text-gray-300">EU</span>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Content Types */}
      <SettingsSection title="Content Types">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          You can choose the default content type. It is required to have the default content type of the space defined.
        </p>
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Default content type
          </label>
          <SelectDropdown
            value={defaultRoot}
            onChange={setDefaultRoot}
            options={contentTypeOptions}
            placeholder="Select a content type..."
            loading={loadingTypes}
          />
        </div>
      </SettingsSection>
    </div>
  )
}
