'use client'

import { RotateCcw } from 'lucide-react'
import { AssetThumb } from './asset-thumb'
import type { Asset } from './asset-grid'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function formatExt(contentType: string): string {
  const parts = contentType.split('/')
  return parts[1] ?? parts[0] ?? ''
}

interface AssetListProps {
  assets: Asset[]
  spaceId: string
  isLoading?: boolean
  showRestore?: boolean
  onRestore?: (asset: Asset) => void
  onAssetClick?: (asset: Asset) => void
}

export function AssetList({ assets, spaceId, isLoading, showRestore, onRestore, onAssetClick }: AssetListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-lg">
            <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse shrink-0" />
            <div className="flex-1 flex gap-4">
              <div className="flex-1">
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-48 mb-1.5" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-16" />
              </div>
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-20" />
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-28" />
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-36" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <p className="text-sm">No assets found</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
      {assets.map(asset => (
        <div
          key={asset.id}
          className="flex items-center gap-4 py-3 px-1 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg group cursor-pointer"
          onClick={() => onAssetClick?.(asset)}
        >
          {/* Thumbnail */}
          <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0 flex items-center justify-center p-1.5">
            <AssetThumb
              filename={asset.filename}
              contentType={asset.content_type}
              spaceId={spaceId}
              alt={asset.alt}
              size={80}
              imgClassName="max-w-full max-h-full w-auto h-auto object-contain"
              iconClassName="w-7 h-7 text-gray-400"
            />
          </div>

          {/* Name + ext */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {asset.short_filename || asset.filename.split('/').pop()}
            </p>
            <p className="text-xs text-gray-400">.{formatExt(asset.content_type)}</p>
          </div>

          {/* Size */}
          <span className="text-sm text-gray-500 dark:text-gray-400 w-20 text-right shrink-0">
            {formatBytes(asset.content_length)}
          </span>

          {/* MIME type */}
          <span className="text-sm text-gray-500 dark:text-gray-400 w-36 shrink-0 hidden md:block">
            {asset.content_type}
          </span>

          {/* Date */}
          <span className="text-sm text-gray-500 dark:text-gray-400 w-40 shrink-0 hidden lg:block">
            {formatDate(asset.updated_at)}
          </span>

          {/* Restore button (deleted view) */}
          {showRestore && onRestore && (
            <button
              onClick={e => { e.stopPropagation(); onRestore(asset) }}
              title="Restore"
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
