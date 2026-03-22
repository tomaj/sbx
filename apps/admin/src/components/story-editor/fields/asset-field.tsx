'use client'

import { ImageIcon } from 'lucide-react'
import type { AssetFieldDef, MultiassetFieldDef } from '@/components/block-library/edit-block-modal/types'
import { fieldLabel } from '../field-label'
import { FieldLabel } from '../FieldLabel'

interface AssetValue {
  id?: number
  filename?: string
  alt?: string
  title?: string
}

interface SingleProps {
  fieldKey: string
  def: AssetFieldDef
  value: AssetValue | undefined
  onChange: (v: AssetValue) => void
}

interface MultiProps {
  fieldKey: string
  def: MultiassetFieldDef
  value: AssetValue[] | undefined
  onChange: (v: AssetValue[]) => void
}

function AssetPreview({ value }: { value: AssetValue | undefined }) {
  if (!value?.filename) return null
  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(value.filename)
  return (
    <div className="flex items-center gap-2 mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value.filename} alt={value.alt ?? ''} className="w-12 h-12 object-cover rounded" />
      ) : (
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
          <ImageIcon className="w-5 h-5 text-gray-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{value.filename.split('/').pop()}</p>
        {value.alt && <p className="text-xs text-gray-500 truncate">{value.alt}</p>}
      </div>
    </div>
  )
}

export function AssetField({ fieldKey, def, value, onChange }: SingleProps) {
  return (
    <div>
      <FieldLabel label={fieldLabel(def.display_name, fieldKey)} required={def.required} description={def.description} />
      <input
        type="text"
        placeholder="Asset URL or filename"
        value={value?.filename ?? ''}
        onChange={(e) => onChange({ ...value, filename: e.target.value })}
        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
      <AssetPreview value={value} />
      <p className="text-xs text-gray-400 mt-1">Asset picker coming soon</p>
    </div>
  )
}

export function MultiassetField({ fieldKey, def, value, onChange }: MultiProps) {
  const assets = value ?? []
  return (
    <div>
      <FieldLabel label={fieldLabel(def.display_name, fieldKey)} required={def.required} description={def.description} />
      <div className="space-y-2">
        {assets.map((asset, i) => (
          <div key={i} className="flex items-center gap-2">
            <AssetPreview value={asset} />
            <button
              type="button"
              onClick={() => onChange(assets.filter((_, j) => j !== i))}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-1">Multi-asset picker coming soon</p>
    </div>
  )
}
