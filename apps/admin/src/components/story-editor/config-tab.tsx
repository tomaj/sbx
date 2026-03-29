'use client'

import { useState, useRef } from 'react'
import { Home, HelpCircle } from 'lucide-react'
import type { StoryDetail } from './types'

interface Props {
  story: StoryDetail
  onSave: (data: Partial<StoryDetail>) => Promise<void>
  isFormOnly?: boolean
}

export function ConfigTab({ story, onSave, isFormOnly }: Props) {
  const [name, setName] = useState(story.name)
  const [slug, setSlug] = useState(story.slug)
  const [isStartpage, setIsStartpage] = useState(story.is_startpage)
  const [path, setPath] = useState(story.path ?? '')
  const [tagInput, setTagInput] = useState(story.tag_list.join(', '))
  const [disableFEEditor, setDisableFEEditor] = useState(story.disable_fe_editor ?? false)
  const [saving, setSaving] = useState(false)
  const [showEditModeTooltip, setShowEditModeTooltip] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({
        name,
        slug,
        is_startpage: isStartpage,
        path: path || null,
        tag_list: tagInput.split(',').map((t) => t.trim()).filter(Boolean),
        disable_fe_editor: disableFEEditor,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Configuration</h3>

        {isFormOnly && (
          <div className="px-3 py-2 text-sm bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-400">
            Visual editor is disabled for this folder. Editing in form-only mode.
          </div>
        )}

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
            disabled={isStartpage}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-900"
          />
        </div>

        <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <input
            id="is-startpage"
            type="checkbox"
            checked={isStartpage}
            onChange={(e) => setIsStartpage(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 shrink-0"
          />
          <div>
            <label htmlFor="is-startpage" className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              <Home className="w-3.5 h-3.5" />
              Define as root for the folder
            </label>
            <p className="text-xs text-gray-400 mt-0.5">
              Allows you to use the slug of the folder for the current Story. Example <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">/posts</code> for an overview instead of <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">/posts/overview</code>.
            </p>
          </div>
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

        {story.is_folder && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Folder content settings</h4>
            <div className="flex items-start gap-3">
              <input
                id="disable-fe-editor"
                type="checkbox"
                checked={disableFEEditor}
                onChange={(e) => setDisableFEEditor(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 shrink-0"
              />
              <div>
                <label htmlFor="disable-fe-editor" className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Disable visual editor (Form only)
                  <div className="relative inline-flex">
                    <button
                      type="button"
                      onMouseEnter={() => setShowEditModeTooltip(true)}
                      onMouseLeave={() => setShowEditModeTooltip(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                    {showEditModeTooltip && (
                      <div className="absolute left-6 top-0 z-50 w-64 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none">
                        When enabled, stories in this folder will open in form-only mode — no visual editor preview will be shown.
                        <div className="absolute left-[-4px] top-2 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45" />
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}
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
