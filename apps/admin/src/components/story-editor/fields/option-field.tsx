'use client'

import type { OptionFieldDef } from '@/components/block-library/edit-block-modal/types'

interface Props {
  fieldKey: string
  def: OptionFieldDef
  value: string | undefined
  onChange: (v: string) => void
}

export function OptionField({ fieldKey, def, value, onChange }: Props) {
  const options = def.options ?? []

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {def.display_name || fieldKey}
        {def.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {def.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{def.description}</p>
      )}
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
      >
        {!def.exclude_empty_option && <option value="">— Select —</option>}
        {options.map((opt) => (
          <option key={opt._uid ?? opt.value} value={opt.value}>
            {opt.name}
          </option>
        ))}
      </select>
    </div>
  )
}
