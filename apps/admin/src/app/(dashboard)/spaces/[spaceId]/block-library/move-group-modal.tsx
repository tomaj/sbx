'use client';

import { useState } from 'react';
import type { ComponentGroup } from '@/components/block-library/group-tree';

interface MoveGroupModalProps {
  open: boolean;
  groups: ComponentGroup[];
  selectedCount: number;
  onMove: (targetUuid: string | null) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function MoveGroupModal({
  open,
  groups,
  selectedCount,
  onMove,
  onCancel,
  loading,
}: MoveGroupModalProps) {
  const [moveTargetUuid, setMoveTargetUuid] = useState<string | null>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: backdrop dismiss */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss */}
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Move {selectedCount} block{selectedCount === 1 ? '' : 's'} to group
        </h2>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-y-auto max-h-64 mb-4">
          <button
            type="button"
            onClick={() => setMoveTargetUuid(null)}
            className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
              moveTargetUuid === null
                ? 'bg-gray-100 dark:bg-gray-800 text-teal-600 dark:text-teal-400 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            No group
          </button>
          {groups.map((g) => (
            <button
              type="button"
              key={g.id}
              onClick={() => setMoveTargetUuid(g.uuid)}
              className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                moveTargetUuid === g.uuid
                  ? 'bg-gray-100 dark:bg-gray-800 text-teal-600 dark:text-teal-400 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onMove(moveTargetUuid)}
            disabled={loading}
            className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? 'Moving...' : 'Move'}
          </button>
        </div>
      </div>
    </div>
  );
}
