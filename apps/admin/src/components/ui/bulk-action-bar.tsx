'use client';

import type { ReactNode } from 'react';

export interface BulkAction {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  /** Render a custom element instead of a button (e.g. CopyButton) */
  custom?: ReactNode;
}

interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkAction[];
  onClearSelection?: () => void;
}

export function BulkActionBar({ selectedCount, actions, onClearSelection }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-gray-900 dark:bg-gray-800 text-white rounded-xl shadow-2xl px-4 py-3">
      <span className="text-sm font-medium mr-2 text-gray-300">{selectedCount} selected</span>

      {actions.map((action, i) => {
        if (action.custom) return <span key={i}>{action.custom}</span>;

        const isDanger = action.variant === 'danger';
        return (
          <button
            key={i}
            onClick={action.onClick}
            disabled={action.disabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors disabled:opacity-50 ${
              isDanger ? 'hover:bg-red-500/20 text-red-400 hover:text-red-300' : 'hover:bg-white/10'
            }`}
          >
            {action.icon}
            {action.label}
          </button>
        );
      })}

      {onClearSelection && (
        <>
          <div className="w-px h-5 bg-white/20 mx-1" />
          <button
            onClick={onClearSelection}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-white/10 text-gray-400 transition-colors"
          >
            Clear
          </button>
        </>
      )}
    </div>
  );
}
