'use client';

import { MoreHorizontal } from 'lucide-react';
import { useContextMenu } from '@/hooks/use-context-menu';
import { cn } from '@/lib/utils';

export interface DropdownMenuItem {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

interface DropdownMenuProps {
  items: DropdownMenuItem[];
  trigger?: React.ReactNode;
  align?: 'left' | 'right';
}

export function DropdownMenu({ items, trigger, align = 'right' }: DropdownMenuProps) {
  const { open, ref, toggle, close } = useContextMenu();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded"
      >
        {trigger ?? <MoreHorizontal className="w-4 h-4" />}
      </button>
      {open && (
        <div
          className={cn(
            'absolute z-50 mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  item.onClick();
                  close();
                }}
                className={cn(
                  'w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors disabled:opacity-50',
                  item.variant === 'danger'
                    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700',
                )}
              >
                {Icon && <Icon className="w-4 h-4 shrink-0" />}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
