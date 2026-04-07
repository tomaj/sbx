'use client';

import { Image } from 'lucide-react';
import { AssetPickerModal } from '@/components/assets/asset-picker-modal';
import { AssetThumb } from '@/components/assets/asset-thumb';
import type { Asset } from '@/components/assets/asset-grid';
import { normalizeAssetFilename } from '@/lib/utils';
import type { LinkValue } from './types';

interface AssetLinkInlineProps {
  displayUrl: string;
}

export function AssetLinkInline({ displayUrl }: AssetLinkInlineProps) {
  return (
    <input
      type="text"
      disabled
      value={displayUrl}
      placeholder="Select an asset below..."
      className="flex-1 px-3 py-2 text-sm bg-transparent text-gray-500 dark:text-gray-400 placeholder-gray-400 focus:outline-none min-w-0 cursor-default"
    />
  );
}

interface AssetLinkCardProps {
  displayUrl: string;
  spaceId: string;
  assetPickerOpen: boolean;
  onAssetPickerToggle: (open: boolean) => void;
  onUpdate: (patch: Partial<LinkValue>) => void;
}

export function AssetLinkCard({
  displayUrl,
  spaceId,
  assetPickerOpen,
  onAssetPickerToggle,
  onUpdate,
}: AssetLinkCardProps) {
  const assetUrl = displayUrl;
  const assetShortName = assetUrl.split('/').pop() ?? '';

  function handleAssetSelect(assets: Asset[]) {
    const asset = assets[0];
    if (!asset) return;
    const url = normalizeAssetFilename(asset.filename);
    onUpdate({ linktype: 'asset', url, href: url, cached_url: url, id: String(asset.id) });
    onAssetPickerToggle(false);
  }

  return (
    <>
      <div className="mt-2">
        {assetUrl ? (
          <button
            type="button"
            onClick={() => onAssetPickerToggle(true)}
            className="w-full flex items-center gap-3 border border-gray-200 dark:border-gray-700 rounded-xl p-2 bg-white dark:bg-gray-900 hover:border-teal-400 hover:bg-teal-50/30 dark:hover:bg-teal-900/10 transition-colors text-left"
          >
            <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
              <AssetThumb
                filename={assetUrl}
                contentType={
                  /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(assetUrl)
                    ? 'image/jpeg'
                    : /\.svg$/i.test(assetUrl)
                      ? 'image/svg+xml'
                      : 'application/octet-stream'
                }
                spaceId={spaceId}
                size={120}
                imgClassName="w-full h-full object-cover"
                iconClassName="w-6 h-6 text-gray-400"
              />
            </div>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
              {assetShortName}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onAssetPickerToggle(true)}
            className="w-full flex items-center gap-3 border border-gray-200 dark:border-gray-700 rounded-xl p-2 bg-white dark:bg-gray-900 hover:border-teal-400 hover:bg-teal-50/30 dark:hover:bg-teal-900/10 transition-colors text-left"
          >
            <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <Image className="w-6 h-6 text-gray-400" />
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              + Add Asset
            </span>
          </button>
        )}
      </div>

      {assetPickerOpen && (
        <AssetPickerModal
          spaceId={spaceId}
          mode="single"
          onSelect={handleAssetSelect}
          onClose={() => onAssetPickerToggle(false)}
        />
      )}
    </>
  );
}
