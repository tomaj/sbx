'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useApi } from '@/lib/swr';
import { ChevronDown, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tag } from '@sbx/types';

interface TagsMultiselectProps {
  spaceId: string;
  objectType?: 'component' | 'asset';
  value: Tag[];
  onChange: (value: Tag[]) => void;
  placeholder?: string;
  className?: string;
}

export function TagsMultiselect({
  spaceId,
  objectType = 'component',
  value,
  onChange,
  placeholder = 'Choose existing or add new',
  className,
}: TagsMultiselectProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: tagsData, mutate: mutateTags } = useApi<{ internal_tags: Tag[] }>(
    `/api/admin/spaces/${spaceId}/internal_tags?by_object_type=${objectType}`,
  );
  const tags = tagsData?.internal_tags ?? [];

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 0);
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setInput('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const filtered = useMemo(() => {
    const q = input.trim().toLowerCase();
    return q ? tags.filter((t) => t.name.toLowerCase().includes(q)) : tags;
  }, [tags, input]);

  const selectedIds = new Set(value.map((t) => t.id));
  const canCreate =
    input.trim().length > 0 &&
    !tags.some((t) => t.name.toLowerCase() === input.trim().toLowerCase());

  function toggle(tag: Tag) {
    if (selectedIds.has(tag.id)) {
      onChange(value.filter((t) => t.id !== tag.id));
    } else {
      onChange([...value, tag]);
    }
  }

  function removeTag(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(value.filter((t) => t.id !== id));
  }

  async function createAndAdd() {
    const name = input.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/internal_tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, object_type: objectType }),
      });
      const data = await res.json();
      const newTag: Tag = data.internal_tag ?? { id: Date.now(), name };
      await mutateTags();
      if (!selectedIds.has(newTag.id)) {
        onChange([...value, newTag]);
      }
      setInput('');
    } catch {
      setInput('');
    } finally {
      setCreating(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (canCreate) {
        createAndAdd();
      } else if (filtered.length === 1) {
        toggle(filtered[0]);
        setInput('');
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setInput('');
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center w-full min-h-[38px] border rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800 transition-colors text-left',
          open
            ? 'border-teal-500 ring-2 ring-teal-500'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
        )}
      >
        <span className="flex-1 flex flex-wrap gap-1">
          {value.length === 0 ? (
            <span className="text-gray-400 text-sm">{placeholder}</span>
          ) : (
            value.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
              >
                {tag.name}
                <span
                  role="button"
                  onClick={(e) => removeTag(tag.id, e)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </span>
              </span>
            ))
          )}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-gray-400 shrink-0 ml-1 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="absolute z-50 bottom-full mb-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg flex flex-col overflow-hidden">
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && !canCreate ? (
              <p className="text-center text-sm text-gray-400 py-4">No tags yet</p>
            ) : (
              filtered.map((tag) => {
                const checked = selectedIds.has(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggle(tag)}
                    className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div
                      className={cn(
                        'size-4 shrink-0 rounded border flex items-center justify-center transition-colors',
                        checked
                          ? 'bg-teal-600 border-teal-600'
                          : 'border-gray-300 dark:border-gray-600',
                      )}
                    >
                      {checked && (
                        <svg
                          viewBox="0 0 12 12"
                          className="w-3 h-3 text-white fill-none stroke-white"
                          strokeWidth={2}
                        >
                          <polyline points="2,6 5,9 10,3" />
                        </svg>
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-sm',
                        checked
                          ? 'text-teal-600 dark:text-teal-400 font-medium'
                          : 'text-gray-800 dark:text-gray-200',
                      )}
                    >
                      {tag.name}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-2 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search or create new..."
              className="flex-1 text-sm bg-transparent outline-none text-gray-800 dark:text-gray-200 placeholder:text-gray-400"
            />
            {canCreate && (
              <button
                type="button"
                onClick={createAndAdd}
                disabled={creating}
                className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:underline disabled:opacity-50 shrink-0"
              >
                <Plus className="w-3 h-3" />
                Create &ldquo;{input.trim()}&rdquo;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
