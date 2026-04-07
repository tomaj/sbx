'use client';

import { Check } from 'lucide-react';
import { AssetThumb } from './asset-thumb';

export interface Asset {
  id: number;
  filename: string;
  short_filename: string;
  content_type: string;
  content_length: number;
  alt: string | null;
  title: string | null;
  asset_folder_id: number | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AssetGridProps {
  assets: Asset[];
  spaceId: string;
  isLoading?: boolean;
  onAssetClick?: (asset: Asset) => void;
  selectedIds?: Set<number>;
  onToggleSelect?: (id: number) => void;
}

function formatExt(contentType: string): string {
  const parts = contentType.split('/');
  return parts[1] ?? parts[0] ?? '';
}

export function AssetGrid({
  assets,
  spaceId,
  isLoading,
  onAssetClick,
  selectedIds,
  onToggleSelect,
}: AssetGridProps) {
  // isSelecting: true when at least one item is selected → card clicks toggle selection
  const isSelecting = selectedIds !== undefined && selectedIds.size > 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="aspect-[4/3] rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="h-3.5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <p className="text-sm">No assets found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-5 p-1">
      {assets.map((asset) => {
        const isSelected = selectedIds?.has(asset.id) ?? false;

        function handleClick() {
          if (isSelecting) {
            // In selection mode: clicking the card toggles selection
            onToggleSelect?.(asset.id);
          } else {
            // Normal mode: clicking opens detail
            onAssetClick?.(asset);
          }
        }

        return (
          <div
            key={asset.id}
            className="flex flex-col gap-2 group cursor-pointer"
            onClick={handleClick}
          >
            <div
              className={`relative aspect-[4/3] rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden transition-all flex items-center justify-center p-3 ${
                isSelected ? 'ring-2 ring-teal-500' : 'hover:ring-2 hover:ring-teal-500'
              }`}
            >
              <AssetThumb
                filename={asset.filename}
                contentType={asset.content_type}
                spaceId={spaceId}
                alt={asset.alt}
                size={400}
                imgClassName="max-w-full max-h-full w-auto h-auto object-contain"
                iconClassName="w-14 h-14 text-gray-400"
              />

              {/* Checkbox / checkmark badge */}
              {selectedIds !== undefined && (
                <div
                  className={`absolute top-2 left-2 w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-teal-500 opacity-100'
                      : 'bg-white/80 dark:bg-gray-700/80 opacity-0 group-hover:opacity-100 border border-gray-300 dark:border-gray-500'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect?.(asset.id);
                  }}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-800 dark:text-gray-200 truncate leading-snug font-medium">
                {asset.short_filename || asset.filename.split('/').pop()}
              </p>
              <p className="text-xs text-gray-400 leading-snug">.{formatExt(asset.content_type)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
