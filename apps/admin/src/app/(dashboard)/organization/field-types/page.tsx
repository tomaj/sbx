'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Code2 } from 'lucide-react'

interface FieldType {
  id: number
  name: string
  approved_version: number | null
}

export default function OrgFieldTypesPage() {
  const router = useRouter()
  const [fieldTypes, setFieldTypes] = useState<FieldType[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    fetch('/api/admin/field-types')
      .then((r) => r.json())
      .then((d) => { setFieldTypes(d.field_types ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return fieldTypes
    return fieldTypes.filter((ft) => ft.name.toLowerCase().includes(search.toLowerCase()))
  }, [fieldTypes, search])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreateError('')
    const res = await fetch('/api/admin/field-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_type: { name: newName.trim() } }),
    })
    const data = await res.json()
    if (!res.ok) { setCreateError(data.message ?? 'Error'); return }
    router.push(`/organization/field-types/${data.field_type.id}`)
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Field-types</h1>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Field-type
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">New field-type name</p>
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. my-custom-picker"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button type="submit" className="px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors">
              Create
            </button>
            <button type="button" onClick={() => { setCreating(false); setNewName(''); setCreateError('') }}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              Cancel
            </button>
          </form>
          {createError && <p className="text-xs text-red-500 mt-2">{createError}</p>}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search field-types ..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-px border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-0">
              <div>
                <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1.5" />
                <div className="h-3 w-16 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Code2 className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">{search ? 'No field-types match your search' : 'No field-types yet'}</p>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {filtered.map((ft) => (
            <div
              key={ft.id}
              className="flex items-center justify-between px-4 py-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
            >
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{ft.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">#{ft.id}</div>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/organization/field-types/${ft.id}`)}
                className="text-sm font-medium text-teal-600 dark:text-teal-400 hover:underline"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
