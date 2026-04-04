'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useApi } from '@/lib/swr';
import { ChevronDown, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContentTypeSelectorProps {
  spaceId?: string;
  /** Pre-loaded options — if provided, skips the API fetch */
  options?: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export function ContentTypeSelector({
  spaceId,
  options: preloadedOptions,
  value,
  onChange,
  placeholder = 'All content types',
}: ContentTypeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Only fetch from API when no pre-loaded options are provided
  const { data: componentsData } = useApi<{ components: { name: string }[] }>(
    preloadedOptions === undefined && spaceId
      ? `/api/admin/spaces/${spaceId}/components?per_page=500`
      : null,
  );
  const fetchedComponents = useMemo(() => {
    const names = (componentsData?.components ?? []).map((c) => c.name);
    names.sort();
    return names;
  }, [componentsData]);

  const components = preloadedOptions ? preloadedOptions.map((o) => o.value) : fetchedComponents;

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  function toggle(name: string) {
    onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name]);
  }

  function remove(name: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(value.filter((v) => v !== name));
  }

  function openDropdown() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? components.filter((c) => c.toLowerCase().includes(q)) : components;
  }, [components, search]);

  return (
    <div ref={containerRef} className="relative">
      {/* Input area with tags */}
      <div
        onClick={openDropdown}
        className={cn(
          'flex flex-wrap items-center gap-1.5 min-h-[42px] px-3 py-2 border rounded-lg cursor-text bg-white dark:bg-gray-800 transition-colors',
          open
            ? 'border-teal-600 ring-1 ring-teal-600'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
        )}
      >
        {value.map((v) => {
          const label = preloadedOptions?.find((o) => o.value === v)?.label ?? v;
          return (
            <span
              key={v}
              className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded px-2 py-0.5 text-xs text-gray-800 dark:text-gray-200 shrink-0"
            >
              {label}
              <button
                type="button"
                onClick={(e) => remove(v, e)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 leading-none"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] text-sm bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
        />
        <ChevronDown
          className={cn(
            'w-4 h-4 text-gray-400 shrink-0 transition-transform ml-1',
            open && 'rotate-180',
          )}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-4">
              {components.length === 0 ? 'Loading…' : 'No results'}
            </p>
          ) : (
            filtered.map((name) => {
              const checked = value.includes(name);
              const label = preloadedOptions?.find((o) => o.value === name)?.label ?? name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggle(name)}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div
                    className={cn(
                      'size-4 shrink-0 rounded border flex items-center justify-center transition-colors',
                      checked
                        ? 'bg-teal-600 border-teal-600 text-white'
                        : 'border-gray-300 dark:border-gray-600',
                    )}
                  >
                    {checked && <Check className="size-3" strokeWidth={3} />}
                  </div>
                  <span
                    className={cn(
                      'text-sm',
                      checked
                        ? 'text-teal-700 dark:text-teal-400 font-medium'
                        : 'text-gray-800 dark:text-gray-200',
                    )}
                  >
                    {label}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
