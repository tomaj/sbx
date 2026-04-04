'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Home, HelpCircle, ChevronDown, X, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApi } from '@/lib/swr';
import type { StoryDetail } from './types';

interface Props {
  spaceId: string;
  story: StoryDetail;
  onSave: (data: Partial<StoryDetail>) => Promise<void>;
  isFormOnly?: boolean;
}

// Story tags select — works with string[] tag names via MAPI tags endpoint
function StoryTagsSelect({
  spaceId,
  value,
  onChange,
}: {
  spaceId: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [extraTags, setExtraTags] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: tagsData } = useApi<{ tags: { name: string }[] }>(
    `/api/admin/spaces/${spaceId}/tags?all_tags=1&per_page=200`,
  );
  const available = useMemo(() => {
    const fetched = (tagsData?.tags ?? []).map((t) => t.name);
    return [...fetched, ...extraTags.filter((t) => !fetched.includes(t))];
  }, [tagsData, extraTags]);

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
    return q ? available.filter((t) => t.toLowerCase().includes(q)) : available;
  }, [available, input]);

  const selected = new Set(value);
  const canCreate =
    input.trim().length > 0 &&
    !available.some((t) => t.toLowerCase() === input.trim().toLowerCase());

  function toggle(name: string) {
    if (selected.has(name)) {
      onChange(value.filter((t) => t !== name));
    } else {
      onChange([...value, name]);
    }
  }

  function remove(name: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(value.filter((t) => t !== name));
  }

  function create() {
    const name = input.trim();
    if (!name) return;
    if (!available.includes(name)) setExtraTags((prev) => [...prev, name]);
    if (!selected.has(name)) onChange([...value, name]);
    setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (canCreate) create();
      else if (filtered.length === 1) {
        toggle(filtered[0]);
        setInput('');
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setInput('');
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center w-full min-h-[38px] border rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800 transition-colors text-left',
          open
            ? 'border-teal-500 ring-2 ring-teal-500'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
        )}
      >
        <span className="flex-1 flex flex-wrap gap-1">
          {value.length === 0 ? (
            <span className="text-gray-400 text-sm">Choose existing or add new</span>
          ) : (
            value.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
              >
                {tag}
                <span
                  role="button"
                  onClick={(e) => remove(tag, e)}
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
        <div className="absolute z-50 top-full mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search..."
              className="flex-1 text-sm bg-transparent outline-none text-gray-800 dark:text-gray-200 placeholder:text-gray-400"
            />
            {canCreate && (
              <button
                type="button"
                onClick={create}
                className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:underline shrink-0"
              >
                <Plus className="w-3 h-3" />
                Add &ldquo;{input.trim()}&rdquo;
              </button>
            )}
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-4">No tags found</p>
            ) : (
              filtered.map((tag) => {
                const checked = selected.has(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      toggle(tag);
                      setInput('');
                    }}
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
                      {tag}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FieldLabel({ label, tooltip }: { label: string; tooltip: string }) {
  const [show, setShow] = useState(false);
  return (
    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {label}
      <div className="relative inline-flex">
        <button
          type="button"
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
        {show && (
          <div className="absolute left-6 top-0 z-50 w-64 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none">
            {tooltip}
            <div className="absolute left-[-4px] top-2 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45" />
          </div>
        )}
      </div>
    </label>
  );
}

export function ConfigTab({ spaceId, story, onSave, isFormOnly }: Props) {
  const [name, setName] = useState(story.name);
  const [slug, setSlug] = useState(story.slug);
  const [isStartpage, setIsStartpage] = useState(story.is_startpage);
  const [path, setPath] = useState(story.path ?? '');
  const [tags, setTags] = useState<string[]>(story.tag_list);
  const [sortByDate, setSortByDate] = useState(story.sort_by_date ?? '');
  const [editMode, setEditMode] = useState<'visual' | 'form-only'>(
    story.disable_fe_editor ? 'form-only' : 'visual',
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        name,
        slug,
        is_startpage: isStartpage,
        path: path || null,
        tag_list: tags,
        sort_by_date: sortByDate || null,
        disable_fe_editor: editMode === 'form-only',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Configuration</h3>

        {/* Edit mode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Edit mode
          </label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                className={cn(
                  'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                  editMode === 'visual'
                    ? 'border-teal-500'
                    : 'border-gray-400 dark:border-gray-500',
                )}
                onClick={() => setEditMode('visual')}
              >
                {editMode === 'visual' && <div className="w-2 h-2 rounded-full bg-teal-500" />}
              </div>
              <span
                className="text-sm text-gray-700 dark:text-gray-300"
                onClick={() => setEditMode('visual')}
              >
                Visual
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                className={cn(
                  'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                  editMode === 'form-only'
                    ? 'border-teal-500'
                    : 'border-gray-400 dark:border-gray-500',
                )}
                onClick={() => setEditMode('form-only')}
              >
                {editMode === 'form-only' && <div className="w-2 h-2 rounded-full bg-teal-500" />}
              </div>
              <span
                className="text-sm text-gray-700 dark:text-gray-300"
                onClick={() => setEditMode('form-only')}
              >
                Form-only
              </span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Slug
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={isStartpage}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-900"
          />
        </div>

        <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <input
            id="is-startpage"
            type="checkbox"
            checked={isStartpage}
            onChange={(e) => setIsStartpage(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 shrink-0"
          />
          <div>
            <label
              htmlFor="is-startpage"
              className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              Define as root for the folder
            </label>
            <p className="text-xs text-gray-400 mt-0.5">
              Allows you to use the slug of the folder for the current Story. Example{' '}
              <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">/posts</code> for an
              overview instead of{' '}
              <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">/posts/overview</code>.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tags
          </label>
          <StoryTagsSelect spaceId={spaceId} value={tags} onChange={setTags} />
        </div>

        <div>
          <FieldLabel
            label="Sort by date"
            tooltip="Allows sorting by date using sort_by=sort_by_date as parameter."
          />
          <div className="relative">
            <input
              type="text"
              value={sortByDate}
              onChange={(e) => setSortByDate(e.target.value)}
              placeholder="Select date (YY-MM-DD)"
              className="w-full px-3 py-2 pl-9 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
        </div>

        <div>
          <FieldLabel
            label="Real path"
            tooltip="The real path is the location that the editor opens if the location differs from the slug defined."
          />
          <textarea
            value={path}
            onChange={(e) => setPath(e.target.value)}
            rows={3}
            placeholder="/"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Full slug
          </label>
          <div className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500">
            {story.full_slug}
          </div>
          <p className="text-xs text-gray-400 mt-1">Computed from parent path + slug</p>
        </div>

        {story.is_folder && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Folder content settings
            </h4>
            <p className="text-xs text-gray-400">
              Set <strong>Form-only</strong> edit mode above to disable the visual editor for all
              stories in this folder.
            </p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2 text-sm font-medium bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save story configuration'}
        </button>
      </div>
    </div>
  );
}
