'use client'

import type { RichtextFieldDef } from '@/components/block-library/edit-block-modal/types'

interface Props {
  fieldKey: string
  def: RichtextFieldDef
  value: any
  onChange: (v: any) => void
}

// Richtext stores a Storyblok richtext document object.
// For now we render as a JSON textarea stub — replace with Tiptap later.
export function RichtextField({ fieldKey, def, value, onChange }: Props) {
  const raw = typeof value === 'string' ? value : JSON.stringify(value ?? '', null, 2)

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {def.display_name || fieldKey}
        {def.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {def.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{def.description}</p>
      )}
      <div className="relative">
        <textarea
          value={raw}
          onChange={(e) => {
            try { onChange(JSON.parse(e.target.value)) }
            catch { onChange(e.target.value) }
          }}
          rows={6}
          className="w-full px-3 py-2 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y"
        />
        <span className="absolute top-2 right-2 text-xs text-gray-400 bg-white dark:bg-gray-800 px-1 rounded">
          richtext
        </span>
      </div>
    </div>
  )
}
