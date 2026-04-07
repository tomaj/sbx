'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Lock, X, Check } from 'lucide-react';

export interface SelectOption {
  id: number;
  name: string;
}

interface PermissionSelectorProps {
  mode: 'allowed' | 'blocked';
  onModeChange: (mode: 'allowed' | 'blocked') => void;
  selectedIds: number[];
  onSelectedChange: (ids: number[]) => void;
  options: SelectOption[];
  allLabel: string;
  searchPlaceholder?: string;
}

export function PermissionSelector({
  mode,
  onModeChange,
  selectedIds,
  onSelectedChange,
  options,
  allLabel,
  searchPlaceholder = 'Search...',
}: PermissionSelectorProps) {
  const [modeOpen, setModeOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const modeRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (modeRef.current && !modeRef.current.contains(e.target as Node)) setModeOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(
    (o) => !selectedIds.includes(o.id) && o.name.toLowerCase().includes(query.toLowerCase()),
  );
  const selectedOptions = options.filter((o) => selectedIds.includes(o.id));

  function remove(id: number) {
    onSelectedChange(selectedIds.filter((x) => x !== id));
  }
  function add(id: number) {
    onSelectedChange([...selectedIds, id]);
    setQuery('');
  }

  return (
    <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-visible min-h-[44px]">
      {/* Mode toggle */}
      <div ref={modeRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setModeOpen((v) => !v)}
          className="flex items-center gap-2 px-3 h-full text-sm text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 whitespace-nowrap"
        >
          <Lock className="w-3.5 h-3.5" />
          {mode === 'allowed' ? 'Allowed items' : 'Blocked items'}
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        {modeOpen && (
          <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
            {(['allowed', 'blocked'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  onModeChange(m);
                  setModeOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 ${mode === m ? 'text-teal-600 dark:text-teal-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
              >
                {mode === m && <Check className="w-3.5 h-3.5" />}
                {m === 'allowed' ? 'Allowed items' : 'Blocked items'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selection area */}
      <div
        ref={searchRef}
        className="relative flex-1 flex flex-wrap items-center gap-1.5 px-3 py-2 min-w-0"
      >
        {selectedOptions.length === 0 ? (
          // biome-ignore lint/a11y/noStaticElementInteractions: clickable label
          // biome-ignore lint/a11y/useKeyWithClickEvents: clickable label
          <span
            className="text-sm text-teal-600 dark:text-teal-400 cursor-pointer flex-1"
            onClick={() => setSearchOpen(true)}
          >
            {allLabel}
          </span>
        ) : (
          selectedOptions.map((o) => (
            <span
              key={o.id}
              className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-700 dark:text-gray-300"
            >
              {o.name}
              <button
                type="button"
                onClick={() => remove(o.id)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        )}

        {/* Add button / chevron */}
        <button
          type="button"
          onClick={() => {
            setSearchOpen(true);
          }}
          className="ml-auto shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <ChevronDown className="w-4 h-4" />
        </button>

        {/* Dropdown */}
        {searchOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
            <div className="p-2 border-b border-gray-100 dark:border-gray-800">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full px-2 py-1 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400">No items found</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => add(o.id)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {o.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
