'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

export function AddBlockDivider({ onAdd, empty = false }: { onAdd: () => void; empty?: boolean }) {
  const [hovered, setHovered] = useState(false);

  if (empty) {
    return (
      <div
        className={`relative flex items-center justify-center h-10 rounded-lg border border-dashed cursor-pointer transition-colors ${
          hovered
            ? 'border-teal-400 bg-teal-50/50 dark:bg-teal-900/10'
            : 'border-gray-200 dark:border-gray-700'
        }`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onAdd}
      >
        <div
          className={`flex items-center gap-1.5 text-sm transition-colors ${hovered ? 'text-teal-600 dark:text-teal-400' : 'text-gray-300 dark:text-gray-600'}`}
        >
          <Plus className="w-4 h-4" />
          <span>Add block</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative h-5 flex items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered ? (
        <>
          {/* Line */}
          <div className="absolute inset-x-0 top-1/2 h-0.5 bg-gray-800 dark:bg-gray-200 pointer-events-none" />
          {/* Tooltip */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium px-2 py-1 rounded-md shadow-sm whitespace-nowrap z-20 pointer-events-none">
            Add Block
          </div>
          {/* Circle button */}
          <button
            type="button"
            onClick={onAdd}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 flex items-center justify-center z-10 shadow hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </>
      ) : (
        <div className="absolute inset-x-0 top-1/2 h-px bg-gray-100 dark:bg-gray-800 pointer-events-none" />
      )}
    </div>
  );
}
