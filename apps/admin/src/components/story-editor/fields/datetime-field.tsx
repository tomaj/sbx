'use client'

import type { DatetimeFieldDef } from '@/components/block-library/edit-block-modal/types'

interface Props {
  fieldKey: string
  def: DatetimeFieldDef
  value: string | undefined
  onChange: (v: string | undefined) => void
}

export function DatetimeField({ fieldKey, def, value, onChange }: Props) {
  // Storyblok stores datetime as ISO string
  const inputType = def.disable_time ? 'date' : 'datetime-local'
  // Convert ISO → input format
  const inputValue = value
    ? def.disable_time
      ? value.slice(0, 10)
      : value.slice(0, 16)
    : ''

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {def.display_name || fieldKey}
        {def.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {def.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{def.description}</p>
      )}
      <input
        type={inputType}
        value={inputValue}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : undefined)}
        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
    </div>
  )
}
