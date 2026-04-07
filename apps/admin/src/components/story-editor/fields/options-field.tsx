'use client';

import { useState, useRef, useEffect } from 'react';
import { useApi } from '@/lib/swr';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import type { OptionsFieldDef } from '@/components/block-library/edit-block-modal/types';
import { SortableList, SortableItem, SortableDragHandle } from '@/components/ui/sortable-list';
import { fieldLabel } from '../field-label';
import { FieldLabel } from '../FieldLabel';
import { StoryPickerMultiModal } from '../StoryPickerMultiModal';

type SimpleOption = { name: string; value: string; _uid?: string };

interface Props {
  fieldKey: string;
  def: OptionsFieldDef;
  value: string[] | undefined;
  onChange: (v: string[]) => void;
  spaceId?: string;
}

export function OptionsField({ fieldKey, def, value, onChange, spaceId }: Props) {
  const isInternalStories = def.source === 'internal_stories';
  const isExternalDatasource = def.source === 'external_datasource' && !!def.external_datasource;

  // For external datasource: fetch options from configured URL
  const [externalOpts, setExternalOpts] = useState<SimpleOption[] | null>(null);
  const [externalLoading, setExternalLoading] = useState(false);
  const [externalError, setExternalError] = useState<string | null>(null);
  useEffect(() => {
    if (!isExternalDatasource || !def.external_datasource) return;
    setExternalLoading(true);
    setExternalError(null);
    fetch(def.external_datasource)
      .then((r) => r.json())
      .then((data) => {
        const raw: Array<{ name?: string; value?: string }> = Array.isArray(data)
          ? data
          : Array.isArray(data?.options)
            ? data.options
            : [];
        setExternalOpts(
          raw.map((o) => ({ name: String(o.name ?? o.value ?? ''), value: String(o.value ?? '') })),
        );
      })
      .catch(() => setExternalError('Failed to load options'))
      .finally(() => setExternalLoading(false));
  }, [isExternalDatasource, def.external_datasource]);

  const staticOptions: SimpleOption[] = isExternalDatasource
    ? (externalOpts ?? [])
    : (def.options ?? []);

  const selected = value ?? [];
  const minError =
    def.min !== undefined && selected.length < def.min
      ? `Select at least ${def.min} option${def.min === 1 ? '' : 's'}`
      : null;
  const maxError =
    def.max !== undefined && selected.length > def.max
      ? `Select at most ${def.max} option${def.max === 1 ? '' : 's'}`
      : null;
  const countError = minError ?? maxError;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<string[]>(selected);
  const containerRef = useRef<HTMLDivElement>(null);

  // For internal_stories: display names keyed by story id/uuid
  const [selectedLabels, setSelectedLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    setPending(value ?? []);
  }, [value]);

  // Fetch display names for already-selected story IDs
  const missing = isInternalStories && spaceId ? selected.filter((v) => !selectedLabels[v]) : [];
  const storyLabelsUrl =
    missing.length > 0
      ? `/api/admin/spaces/${spaceId}/stories?per_page=50&by_ids=${missing.join(',')}`
      : null;
  const { data: storyLabelsData } = useApi<{ stories: Array<{ id: number; name: string }> }>(
    storyLabelsUrl,
  );
  useEffect(() => {
    if (!storyLabelsData?.stories?.length) return;
    const map: Record<string, string> = {};
    for (const s of storyLabelsData.stories) map[String(s.id)] = s.name;
    setSelectedLabels((prev) => ({ ...prev, ...map }));
  }, [storyLabelsData]);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (isExternalDatasource && externalError) {
    return (
      <div>
        <FieldLabel
          label={fieldLabel(def.display_name, fieldKey)}
          required={def.required}
          description={def.description}
        />
        <p className="text-xs text-red-500 mt-1">{externalError}</p>
      </div>
    );
  }

  const filtered = staticOptions.filter(
    (o) => !search.trim() || o.name.toLowerCase().includes(search.toLowerCase()),
  );

  function togglePending(val: string) {
    setPending((prev) => (prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]));
  }

  function handleAdd() {
    onChange(pending);
    setOpen(false);
    setSearch('');
  }

  function clearAll() {
    onChange([]);
    setPending([]);
    setSelectedLabels({});
  }

  function removeItem(val: string) {
    const next = selected.filter((v) => v !== val);
    onChange(next);
    setPending(next);
  }

  function moveUp(i: number) {
    if (i === 0) return;
    const next = [...selected];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    onChange(next);
  }

  function moveDown(i: number) {
    if (i === selected.length - 1) return;
    const next = [...selected];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    onChange(next);
  }

  const orderedSelected = isInternalStories
    ? selected.map((val) => ({ value: val, name: selectedLabels[val] ?? val }))
    : selected
        .map((val) => staticOptions.find((o) => o.value === val))
        .filter(Boolean)
        .map((o) => ({ value: o!.value, name: o!.name }));

  // ── internal_stories: modal-based picker ────────────────────────────────────
  if (isInternalStories) {
    return (
      <>
        <div>
          <FieldLabel
            label={fieldLabel(def.display_name, fieldKey)}
            required={def.required}
            description={def.description}
          />
          {countError && <p className="text-xs text-red-500 mb-1">{countError}</p>}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            {orderedSelected.length > 0 && (
              <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {orderedSelected.length} item{orderedSelected.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    Clear selected
                  </button>
                </div>
                <SortableList
                  items={orderedSelected}
                  getKey={(opt) => opt.value}
                  onReorder={(newItems) => onChange(newItems.map((o) => o.value))}
                  renderItem={(opt, i) => (
                    <SortableItem
                      key={opt.value}
                      id={opt.value}
                      className="group flex items-center gap-2 px-3 py-2.5 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 select-none"
                    >
                      <SortableDragHandle className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                      <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">
                        {opt.name}
                      </span>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => removeItem(opt.value)}
                          title="Remove"
                          className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveUp(i)}
                          disabled={i === 0}
                          title="Move up"
                          className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-30"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveDown(i)}
                          disabled={i === orderedSelected.length - 1}
                          title="Move down"
                          className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-30"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </SortableItem>
                  )}
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <span>Choose one or more...</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {open && spaceId && (
          <StoryPickerMultiModal
            spaceId={spaceId}
            title={fieldLabel(def.display_name, fieldKey)}
            filterContentType={def.filter_content_type}
            useUuid={def.use_uuid}
            value={selected}
            onSelect={(values, names) => {
              setSelectedLabels((prev) => ({ ...prev, ...names }));
              onChange(values);
            }}
            onClose={() => setOpen(false)}
          />
        )}
      </>
    );
  }

  // ── checkbox list appearance ──────────────────────────────────────────────
  if (def.appearance === 'link') {
    return (
      <div>
        <FieldLabel
          label={fieldLabel(def.display_name, fieldKey)}
          required={def.required}
          description={def.description}
        />
        {countError && <p className="text-xs text-red-500 mb-1">{countError}</p>}
        <div className="flex flex-col gap-1.5">
          {staticOptions.map((opt) => (
            <label key={opt._uid ?? opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => {
                  const next = selected.includes(opt.value)
                    ? selected.filter((v) => v !== opt.value)
                    : [...selected, opt.value];
                  onChange(next);
                }}
                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{opt.name}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  // ── card grid appearance ──────────────────────────────────────────────────
  if (def.appearance === 'card') {
    return (
      <div>
        <FieldLabel
          label={fieldLabel(def.display_name, fieldKey)}
          required={def.required}
          description={def.description}
        />
        {countError && <p className="text-xs text-red-500 mb-1">{countError}</p>}
        <div className="grid grid-cols-2 gap-2">
          {staticOptions.map((opt) => {
            const isSelected = selected.includes(opt.value);
            return (
              <button
                key={opt._uid ?? opt.value}
                type="button"
                onClick={() => {
                  const next = isSelected
                    ? selected.filter((v) => v !== opt.value)
                    : [...selected, opt.value];
                  onChange(next);
                }}
                className={`px-3 py-2.5 text-sm text-left rounded-lg border transition-colors ${
                  isSelected
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 font-medium'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {opt.name}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── static options: inline dropdown ─────────────────────────────────────────
  return (
    <div>
      <FieldLabel
        label={fieldLabel(def.display_name, fieldKey)}
        required={def.required}
        description={def.description}
      />
      {countError && <p className="text-xs text-red-500 mb-1">{countError}</p>}
      <div
        ref={containerRef}
        className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
      >
        {orderedSelected.length > 0 && (
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
              <span>
                {orderedSelected.length} item{orderedSelected.length !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={clearAll}
                className="text-teal-600 dark:text-teal-400 hover:underline"
              >
                Clear selected
              </button>
            </div>
            <SortableList
              items={orderedSelected}
              getKey={(opt) => opt.value}
              onReorder={(newItems) => onChange(newItems.map((o) => o.value))}
              renderItem={(opt, i) => (
                <SortableItem
                  key={opt.value}
                  id={opt.value}
                  className="group flex items-center gap-2 px-3 py-2.5 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 select-none"
                >
                  <SortableDragHandle className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                  <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">
                    {opt.name}
                  </span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => removeItem(opt.value)}
                      title="Remove"
                      className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveUp(i)}
                      disabled={i === 0}
                      title="Move up"
                      className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-30"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(i)}
                      disabled={i === orderedSelected.length - 1}
                      title="Move down"
                      className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-30"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </SortableItem>
              )}
            />
          </div>
        )}

        {!open ? (
          <button
            type="button"
            onClick={() => {
              setPending(selected);
              setOpen(true);
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <span>Choose one or more...</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        ) : (
          <div>
            <div className="relative border-b border-gray-200 dark:border-gray-700 ring-2 ring-teal-500 ring-inset">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none"
              />
            </div>
            <div className="max-h-56 overflow-y-auto">
              {externalLoading ? (
                <p className="px-3 py-3 text-sm text-gray-400">Loading options...</p>
              ) : filtered.length === 0 ? (
                <p className="px-3 py-3 text-sm text-gray-400">No options found</p>
              ) : (
                filtered.map((opt) => (
                  <label
                    key={opt._uid ?? opt.value}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={pending.includes(opt.value)}
                      onChange={() => togglePending(opt.value)}
                      className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{opt.name}</span>
                  </label>
                ))
              )}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleAdd}
                className="w-full py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
