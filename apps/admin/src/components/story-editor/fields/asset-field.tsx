'use client'

import { useState } from 'react'
import { ImageIcon, X } from 'lucide-react'
import type { AssetFieldDef, MultiassetFieldDef } from '@/components/block-library/edit-block-modal/types'
import { fieldLabel } from '../field-label'
import { FieldLabel } from '../FieldLabel'
import { AssetPickerModal } from '@/components/assets/asset-picker-modal'
import { AssetThumb } from '@/components/assets/asset-thumb'
import type { Asset } from '@/components/assets/asset-grid'
import { normalizeAssetFilename } from '@/lib/utils'

interface AssetValue {
  id?: number
  filename?: string
  content_type?: string
  alt?: string
  title?: string
}

interface SingleProps {
  fieldKey: string
  def: AssetFieldDef
  value: AssetValue | undefined
  onChange: (v: AssetValue | undefined) => void
  spaceId: string
}

interface MultiProps {
  fieldKey: string
  def: MultiassetFieldDef
  value: AssetValue[] | undefined
  onChange: (v: AssetValue[]) => void
  spaceId: string
}

function assetToValue(asset: Asset): AssetValue {
  return {
    id: asset.id,
    filename: normalizeAssetFilename(asset.filename),
    content_type: asset.content_type,
    alt: asset.alt ?? undefined,
    title: asset.title ?? undefined,
  }
}

function AssetCard({
  value,
  spaceId,
  onRemove,
  onClick,
}: {
  value: AssetValue
  spaceId: string
  onRemove?: () => void
  onClick?: () => void
}) {
  const filename = value.filename ?? ''
  const shortName = filename.split('/').pop() ?? filename
  const contentType = value.content_type ?? (
    /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(filename) ? 'image/jpeg' :
    /\.svg$/i.test(filename) ? 'image/svg+xml' :
    'application/octet-stream'
  )

  return (
    <div className="flex items-center gap-3 border border-gray-200 dark:border-gray-700 rounded-xl p-2 bg-white dark:bg-gray-900">
      {/* Thumbnail */}
      <button
        type="button"
        onClick={onClick}
        className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0 hover:opacity-80 transition-opacity"
      >
        <AssetThumb
          filename={filename}
          contentType={contentType}
          spaceId={spaceId}
          alt={value.alt}
          size={120}
          imgClassName="w-full h-full object-cover"
          iconClassName="w-6 h-6 text-gray-400"
        />
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0" onClick={onClick}>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-snug break-all line-clamp-2">
          {shortName}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">Add description...</p>
      </div>

      {/* Remove */}
      {onRemove && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onRemove() }}
          className="p-1 text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

function EmptyCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 border border-gray-200 dark:border-gray-700 rounded-xl p-2 bg-white dark:bg-gray-900 hover:border-teal-400 hover:bg-teal-50/30 dark:hover:bg-teal-900/10 transition-colors text-left"
    >
      <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
        <ImageIcon className="w-6 h-6 text-gray-400" />
      </div>
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">+ Add Asset</span>
    </button>
  )
}

export function AssetField({ fieldKey, def, value, onChange, spaceId }: SingleProps) {
  const [pickerOpen, setPickerOpen] = useState(false)

  function handleSelect(assets: Asset[]) {
    if (assets[0]) onChange(assetToValue(assets[0]))
  }

  return (
    <div>
      <FieldLabel label={fieldLabel(def.display_name, fieldKey)} required={def.required} description={def.description} />

      {value?.filename ? (
        <AssetCard
          value={value}
          spaceId={spaceId}
          onRemove={() => onChange(undefined)}
          onClick={() => setPickerOpen(true)}
        />
      ) : (
        <EmptyCard onClick={() => setPickerOpen(true)} />
      )}

      {pickerOpen && (
        <AssetPickerModal
          spaceId={spaceId}
          mode="single"
          onSelect={handleSelect}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}

export function MultiassetField({ fieldKey, def, value, onChange, spaceId }: MultiProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const assets = value ?? []

  function handleSelect(picked: Asset[]) {
    const existing = new Set(assets.map(a => a.id))
    const newAssets = picked.filter(a => !existing.has(a.id)).map(assetToValue)
    onChange([...assets, ...newAssets])
  }

  function removeAt(index: number) {
    onChange(assets.filter((_, i) => i !== index))
  }

  return (
    <div>
      <FieldLabel label={fieldLabel(def.display_name, fieldKey)} required={def.required} description={def.description} />

      <div className="space-y-2">
        {assets.map((asset, i) => (
          <AssetCard
            key={asset.id ?? i}
            value={asset}
            spaceId={spaceId}
            onRemove={() => removeAt(i)}
          />
        ))}
        <EmptyCard onClick={() => setPickerOpen(true)} />
      </div>

      {pickerOpen && (
        <AssetPickerModal
          spaceId={spaceId}
          mode="multi"
          onSelect={handleSelect}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}
