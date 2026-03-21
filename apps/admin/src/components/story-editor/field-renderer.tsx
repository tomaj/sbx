'use client'

import type { AnyFieldDef } from '@/components/block-library/edit-block-modal/types'
import type { ComponentMeta } from './types'
import { TextField } from './fields/text-field'
import { TextareaField } from './fields/textarea-field'
import { RichtextField } from './fields/richtext-field'
import { MarkdownField } from './fields/markdown-field'
import { NumberField } from './fields/number-field'
import { BooleanField } from './fields/boolean-field'
import { DatetimeField } from './fields/datetime-field'
import { OptionField } from './fields/option-field'
import { OptionsField } from './fields/options-field'
import { LinkField } from './fields/link-field'
import { AssetField, MultiassetField } from './fields/asset-field'
import { SectionField } from './fields/section-field'
import { TableField } from './fields/table-field'
import { BloksField } from './fields/bloks-field'

interface Props {
  fieldKey: string
  def: AnyFieldDef
  value: any
  onChange: (v: any) => void
  allComponents: ComponentMeta[]
}

export function FieldRenderer({ fieldKey, def, value, onChange, allComponents }: Props) {
  switch (def.type) {
    case 'text':
      return <TextField fieldKey={fieldKey} def={def} value={value} onChange={onChange} />

    case 'textarea':
      return <TextareaField fieldKey={fieldKey} def={def} value={value} onChange={onChange} />

    case 'richtext':
      return <RichtextField fieldKey={fieldKey} def={def} value={value} onChange={onChange} />

    case 'markdown':
      return <MarkdownField fieldKey={fieldKey} def={def} value={value} onChange={onChange} />

    case 'number':
      return <NumberField fieldKey={fieldKey} def={def} value={value} onChange={onChange} />

    case 'boolean':
      return <BooleanField fieldKey={fieldKey} def={def} value={value} onChange={onChange} />

    case 'datetime':
      return <DatetimeField fieldKey={fieldKey} def={def} value={value} onChange={onChange} />

    case 'option':
      return <OptionField fieldKey={fieldKey} def={def} value={value} onChange={onChange} />

    case 'options':
      return <OptionsField fieldKey={fieldKey} def={def} value={value} onChange={onChange} />

    case 'link':
    case 'multilink':
      return <LinkField fieldKey={fieldKey} def={def} value={value} onChange={onChange} />

    case 'asset':
      return <AssetField fieldKey={fieldKey} def={def} value={value} onChange={onChange} />

    case 'multiasset':
      return <MultiassetField fieldKey={fieldKey} def={def} value={value} onChange={onChange} />

    case 'table':
      return <TableField fieldKey={fieldKey} def={def} value={value} onChange={onChange} />

    case 'section':
      return <SectionField fieldKey={fieldKey} def={def} />

    case 'bloks':
      return (
        <BloksField
          fieldKey={fieldKey}
          def={def}
          value={value}
          onChange={onChange}
          allComponents={allComponents}
        />
      )

    case 'custom':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {def.display_name || fieldKey}
          </label>
          <div className="px-3 py-2 text-sm text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            Custom plugin field — not yet supported
          </div>
        </div>
      )

    case 'tab':
      // Tabs are structural, not rendered as fields
      return null

    default:
      return (
        <div className="text-xs text-gray-400 italic">
          Unknown field type: {(def as any).type} ({fieldKey})
        </div>
      )
  }
}
