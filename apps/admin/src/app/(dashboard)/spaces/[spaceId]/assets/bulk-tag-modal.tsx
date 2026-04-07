'use client';

import { useState } from 'react';
import { TagsMultiselect } from '@/components/ui/tags-multiselect';
import type { Tag } from '@sbx/types';

interface BulkTagModalProps {
  open: boolean;
  spaceId: string;
  selectedCount: number;
  onApply: (tags: Tag[]) => void;
  onCancel: () => void;
  saving?: boolean;
}

export function BulkTagModal({
  open,
  spaceId,
  selectedCount,
  onApply,
  onCancel,
  saving,
}: BulkTagModalProps) {
  const [bulkTags, setBulkTags] = useState<Tag[]>([]);

  if (!open) return null;

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop dismiss
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      onClick={onCancel}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: dialog content */}
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Tag {selectedCount} asset{selectedCount === 1 ? '' : 's'}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Selected tags will replace existing tags on all selected assets.
        </p>
        <TagsMultiselect
          spaceId={spaceId}
          objectType="asset"
          value={bulkTags}
          onChange={setBulkTags}
        />
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => {
              onCancel();
              setBulkTags([]);
            }}
            className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onApply(bulkTags)}
            disabled={saving || bulkTags.length === 0}
            className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? 'Applying...' : 'Apply Tags'}
          </button>
        </div>
      </div>
    </div>
  );
}
