'use client'

import type { TextareaFieldDef } from '@/components/block-library/edit-block-modal/types'
import { fieldLabel } from '../field-label'
import { FieldLabel } from '../FieldLabel'

interface Props {
  fieldKey: string
  def: TextareaFieldDef
  value: string | undefined
  onChange: (v: string) => void
}

export function TextareaField({ fieldKey, def, value, onChange }: Props) {
  return (
    <div>
      <FieldLabel label={fieldLabel(def.display_name, fieldKey)} required={def.required} description={def.description} />
      <textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        maxLength={def.max_length}
        rows={4}
        className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y"
        dir={def.rtl ? 'rtl' : undefined}
      />
      {def.max_length && (
        <p className="text-xs text-gray-400 mt-1 text-right">{(value ?? '').length} / {def.max_length}</p>
      )}
    </div>
  )
}
