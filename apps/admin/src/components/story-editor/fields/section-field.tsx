'use client'

import type { SectionFieldDef } from '@/components/block-library/edit-block-modal/types'

interface Props {
  fieldKey: string
  def: SectionFieldDef
}

export function SectionField({ fieldKey, def }: Props) {
  return (
    <div className="pt-2 pb-1">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {def.display_name || fieldKey}
      </h4>
      {def.description && (
        <p className="text-xs text-gray-400 mt-0.5">{def.description}</p>
      )}
      <div className="mt-1 border-t border-gray-200 dark:border-gray-700" />
    </div>
  )
}
