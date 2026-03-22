'use client'

import { use, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ChevronDown, ChevronRight, ArrowLeft, Trash2, ExternalLink } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/confirm-modal'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

interface FieldType {
  id: number
  name: string
  body: string
  compiled_body: string
  space_ids: number[]
  options: { name: string; value: string }[]
  belongs_to_org: boolean
  approved_version: number | null
  user: { email?: string; firstname?: string; lastname?: string } | null
}

interface Space {
  id: number
  name: string
}

function SidebarSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        {title}
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

export default function FieldTypeEditPage({ params }: { params: Promise<{ fieldTypeId: string }> }) {
  const { fieldTypeId } = use(params)
  const router = useRouter()

  const [fieldType, setFieldType] = useState<FieldType | null>(null)
  const [spaces, setSpaces] = useState<Space[]>([])
  const [body, setBody] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDelete, setShowDelete] = useState(false)
  const [localDevMode, setLocalDevMode] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/field-types/${fieldTypeId}`).then((r) => r.json()),
      fetch('/api/admin/spaces').then((r) => r.json()),
    ]).then(([ftData, spacesData]) => {
      const ft = ftData.field_type
      setFieldType(ft)
      setBody(ft?.body ?? '')
      setSpaces(spacesData.spaces ?? [])
    })
  }, [fieldTypeId])

  const handleBodyChange = useCallback((value: string | undefined) => {
    setBody(value ?? '')
    setIsDirty(true)
  }, [])

  async function save() {
    if (!fieldType) return
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/field-types/${fieldTypeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field_type: { body } }),
      })
      if (!res.ok) throw new Error('Save failed')
      const data = await res.json()
      setFieldType(data.field_type)
      setBody(data.field_type.body)
      setIsDirty(false)
    } catch {
      setError('Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  async function toggleSpace(spaceId: number) {
    if (!fieldType) return
    const current = fieldType.space_ids ?? []
    const next = current.includes(spaceId)
      ? current.filter((id) => id !== spaceId)
      : [...current, spaceId]
    const res = await fetch(`/api/admin/field-types/${fieldTypeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_type: { space_ids: next } }),
    })
    const data = await res.json()
    if (res.ok) setFieldType(data.field_type)
  }

  async function handleDelete() {
    await fetch(`/api/admin/field-types/${fieldTypeId}`, { method: 'DELETE' })
    router.push('/organization/field-types')
  }

  if (!fieldType) {
    return (
      <div className="flex flex-col h-full">
        {/* Skeleton header */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
          <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="ml-auto flex gap-2">
            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 bg-gray-50 dark:bg-gray-950 animate-pulse" />
          <div className="w-72 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" />
        </div>
      </div>
    )
  }

  const authorName = fieldType.user
    ? [fieldType.user.firstname, fieldType.user.lastname].filter(Boolean).join(' ') || fieldType.user.email || ''
    : ''

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
        <button
          type="button"
          onClick={() => router.push('/organization/field-types')}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>

        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{fieldType.name}</span>
        <span className="text-xs text-gray-400 px-2 py-0.5 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
          Versions
        </span>

        <div className="flex-1" />

        {error && <span className="text-xs text-red-500">{error}</span>}

        <button
          type="button"
          onClick={save}
          disabled={isSaving || !isDirty}
          className="px-4 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40 text-gray-700 dark:text-gray-300"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={isSaving}
          className="px-4 py-1.5 text-sm font-medium bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50"
        >
          Publish
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Monaco Editor */}
        <div className="flex-1 overflow-hidden bg-[#1e1e1e]">
          <MonacoEditor
            height="100%"
            language="javascript"
            theme="vs-dark"
            value={body}
            onChange={handleBodyChange}
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'off',
              tabSize: 2,
              lineNumbers: 'on',
            }}
          />
        </div>

        {/* Right sidebar */}
        <div className="w-72 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-y-auto">
          <SidebarSection title="Input" defaultOpen={false}>
            <p className="text-xs text-gray-400">Configure the input that will be shown in the schema editor.</p>
          </SidebarSection>

          <SidebarSection title="Field-type Preview">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={localDevMode}
                onChange={(e) => setLocalDevMode(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Enable local development mode</span>
            </label>
          </SidebarSection>

          <SidebarSection title="Output" defaultOpen={false}>
            <p className="text-xs text-gray-400">The output of your field-type plugin will be shown here during preview.</p>
          </SidebarSection>

          <SidebarSection title="Settings & Details">
            {authorName && (
              <div className="mb-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Author</div>
                <div className="text-sm text-gray-900 dark:text-gray-100">{authorName}</div>
              </div>
            )}

            <div className="mb-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium flex items-center gap-1">
                Assigned Spaces
                <span className="text-gray-300 dark:text-gray-600">(?)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {spaces.map((sp) => {
                  const assigned = (fieldType.space_ids ?? []).includes(sp.id)
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => toggleSpace(sp.id)}
                      className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-colors ${
                        assigned
                          ? 'bg-teal-50 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      {sp.name} ({sp.id})
                      {assigned && <span className="ml-0.5 text-teal-500">×</span>}
                    </button>
                  )
                })}
                {spaces.length === 0 && <span className="text-xs text-gray-400">No spaces</span>}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors w-full"
              >
                <Trash2 className="w-4 h-4" />
                Delete Field-type
              </button>
              <p className="text-xs text-gray-400 mt-2">
                Attention: All spaces using this field-type will not be able to use it any longer if you click delete.
              </p>
            </div>
          </SidebarSection>

          <SidebarSection title="Help & Inspiration" defaultOpen={false}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              To create a new field plugin, open a terminal and run
            </p>
            <div className="bg-gray-900 text-gray-100 text-xs rounded-lg px-3 py-2 font-mono mb-4">
              npx @storyblok/field-plugin-cli@latest
            </div>
            <div className="space-y-2">
              {[
                { label: 'Documentation', href: 'https://www.storyblok.com/docs/plugins/field-plugins/introduction' },
                { label: 'Documentation (Legacy)', href: 'https://www.storyblok.com/docs/plugins/custom-field-types' },
                { label: 'Sandbox', href: 'https://field-plugin.storyblok.com/' },
                { label: 'Open-source examples', href: 'https://github.com/storyblok/field-plugin-examples' },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-teal-600 dark:text-teal-400 hover:underline"
                >
                  {link.label}
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              ))}
            </div>
          </SidebarSection>
        </div>
      </div>

      <ConfirmModal
        open={showDelete}
        title="Delete Field-type"
        message={`Are you sure you want to delete "${fieldType.name}"? All spaces using this field-type will no longer be able to use it.`}
        confirmLabel="Delete"
        dangerous
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  )
}
