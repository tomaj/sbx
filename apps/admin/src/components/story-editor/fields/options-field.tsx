'use client'

import type { OptionsFieldDef } from '@/components/block-library/edit-block-modal/types'

interface Props {
  fieldKey: string
  def: OptionsFieldDef
  value: string[] | undefined
  onChange: (v: string[]) => void
}

export function OptionsField({ fieldKey, def, value, onChange }: Props) {
  const options = def.options ?? []
  const selected = value ?? []

  function toggle(optValue: string) {
    if (selected.includes(optValue)) {
      onChange(selected.filter((v) => v !== optValue))
    } else {
      onChange([...selected, optValue])
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {def.display_name || fieldKey}
        {def.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {def.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{def.description}</p>
      )}
      <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
        {options.length === 0 && (
          <p className="px-3 py-2 text-sm text-gray-400">No options defined</p>
        )}
        {options.map((opt) => (
          <label
            key={opt._uid ?? opt.value}
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-0"
          >
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => toggle(opt.value)}
              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">{opt.name}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
