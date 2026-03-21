'use client'

import { useState } from 'react'
import type { StoryDetail } from './types'

interface Props {
  story: StoryDetail
  onSave: (data: Partial<StoryDetail>) => Promise<void>
}

export function ConfigTab({ story, onSave }: Props) {
  const [name, setName] = useState(story.name)
  const [slug, setSlug] = useState(story.slug)
  const [path, setPath] = useState(story.path ?? '')
  const [tagInput, setTagInput] = useState(story.tag_list.join(', '))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({
        name,
        slug,
        path: path || null,
        tag_list: tagInput.split(',').map((t) => t.trim()).filter(Boolean),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Configuration</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="tag1, tag2, tag3"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <p className="text-xs text-gray-400 mt-1">Separate tags with commas</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Real path
          </label>
          <textarea
            value={path}
            onChange={(e) => setPath(e.target.value)}
            rows={3}
            placeholder="about/"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full slug</label>
          <div className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500">
            {story.full_slug}
          </div>
          <p className="text-xs text-gray-400 mt-1">Computed from parent path + slug</p>
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2 text-sm font-medium bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save story configuration'}
        </button>
      </div>
    </div>
  )
}
