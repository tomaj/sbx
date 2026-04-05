'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectDropdownProps {
  options: SelectOption[];
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  /** Shown when value is null/empty; also acts as the "clear" option in the dropdown */
  placeholder?: string;
  loading?: boolean;
  className?: string;
  /** Smaller padding/height for inline uses (pagination, condition rows) */
  compact?: boolean;
  /** No border/bg — for use inside chips or tight inline contexts */
  ghost?: boolean;
  /** Open the dropdown upward instead of downward */
  dropUp?: boolean;
  /** Hide the placeholder/clear option in the dropdown list */
  noPlaceholder?: boolean;
}

export function SelectDropdown({
  options,
  value,
  onChange,
  placeholder = 'Choose...',
  loading = false,
  className,
  compact = false,
  ghost = false,
  dropUp = false,
  noPlaceholder = false,
}: SelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const selected = options.find((o) => o.value === (value ?? ''));
  const showFilter = options.length > 6 && !compact;
  const filtered = showFilter
    ? options.filter((o) => o.label.toLowerCase().includes(filter.toLowerCase()))
    : options;

  function toggle() {
    setOpen((v) => !v);
    setFilter('');
  }

  const buttonClass = ghost
    ? cn(
        'inline-flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 cursor-pointer select-none',
      )
    : compact
      ? cn(
          'flex items-center justify-between gap-1.5 px-2 py-1 border rounded text-sm bg-white dark:bg-gray-900 transition-colors',
          open
            ? 'border-teal-500 ring-1 ring-teal-200 dark:ring-teal-900'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
        )
      : cn(
          'w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-900 transition-colors min-h-[40px]',
          open
            ? 'border-teal-500 ring-2 ring-teal-200 dark:ring-teal-900'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
        );

  return (
    <div ref={containerRef} className={cn('relative', ghost ? 'inline-flex' : '', className)}>
      <button type="button" onClick={toggle} className={buttonClass}>
        <span
          className={cn(
            ghost
              ? 'text-gray-700 dark:text-gray-300'
              : selected
                ? 'text-gray-900 dark:text-gray-100 truncate'
                : 'text-teal-500 dark:text-teal-400 truncate',
          )}
        >
          {loading ? 'Loading...' : (selected?.label ?? placeholder)}
        </span>
        <ChevronDown
          className={cn(
            'flex-shrink-0 text-gray-400',
            ghost || compact ? 'w-3 h-3' : 'w-4 h-4 ml-2',
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            'absolute z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-64 overflow-y-auto overflow-x-hidden',
            dropUp ? 'bottom-full mb-1' : 'top-full mt-1',
            ghost ? 'left-0' : compact ? 'left-0 min-w-[3.5rem]' : 'left-0 right-0',
          )}
          style={ghost ? { minWidth: '130px' } : undefined}
        >
          {showFilter && (
            <div className="sticky top-0 bg-white dark:bg-gray-900 px-3 pt-2 pb-1 border-b border-gray-100 dark:border-gray-800">
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter..."
                className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {!noPlaceholder && placeholder !== undefined && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={cn(
                'w-full text-left px-3 py-2.5 text-sm transition-colors',
                !value
                  ? 'text-teal-600 dark:text-teal-400 font-medium bg-gray-50 dark:bg-gray-800'
                  : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
              )}
            >
              {placeholder}
            </button>
          )}

          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-sm text-gray-400">No results</div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={cn(
                  'w-full text-left px-3 py-2.5 text-sm transition-colors',
                  value === o.value
                    ? 'bg-gray-50 dark:bg-gray-800 font-medium text-teal-600 dark:text-teal-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
                )}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
