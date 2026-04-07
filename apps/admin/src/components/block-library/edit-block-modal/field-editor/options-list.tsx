'use client';

import { Plus, Trash2 } from 'lucide-react';
import { SortableList, SortableItem, SortableDragHandle } from '@/components/ui/sortable-list';
import { SelectDropdown } from '@/components/ui/select-dropdown';
import { useApi } from '@/lib/swr';
import { type OptionFieldDef, type OptionsFieldDef } from '../types';
import { FormRow, Label, CheckboxRow, TooltipHint } from './form-primitives';
import { MultiSelectPicker } from './multi-select-picker';

type SimpleOption = { name: string; value: string; _uid?: string };

export function OptionsList({
  options,
  onChange,
}: {
  options: SimpleOption[];
  onChange: (opts: SimpleOption[]) => void;
}) {
  function update(idx: number, field: 'name' | 'value', val: string) {
    const next = options.map((o, i) => (i === idx ? { ...o, [field]: val } : o));
    onChange(next);
  }

  function remove(idx: number) {
    onChange(options.filter((_, i) => i !== idx));
  }

  function add() {
    onChange([...options, { name: '', value: '', _uid: `uid_${Date.now()}` }]);
  }

  const stableOptions = options.map((o, i) => (o._uid ? o : { ...o, _uid: `uid_fallback_${i}` }));

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs font-medium text-gray-500 w-5" />
        <span className="flex-1 text-xs font-medium text-gray-500 dark:text-gray-400">Name</span>
        <span className="flex-1 text-xs font-medium text-gray-500 dark:text-gray-400">Value</span>
        <span className="w-7" />
      </div>

      <SortableList
        items={stableOptions}
        getKey={(opt) => opt._uid!}
        onReorder={(reordered) => onChange(reordered)}
        renderItem={(opt, idx) => (
          <SortableItem
            key={opt._uid}
            id={opt._uid!}
            className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-100 dark:border-gray-800/60 last:border-0 bg-white dark:bg-gray-900"
          >
            <SortableDragHandle className="shrink-0" />
            <input
              type="text"
              value={opt.name}
              placeholder="Name"
              onChange={(e) => update(idx, 'name', e.target.value)}
              className="flex-1 px-2 py-1 text-sm border border-transparent hover:border-gray-200 focus:border-teal-400 focus:outline-none rounded bg-transparent focus:bg-white dark:focus:bg-gray-900 dark:text-gray-200"
            />
            <input
              type="text"
              value={opt.value}
              placeholder="Value"
              onChange={(e) => update(idx, 'value', e.target.value)}
              className="flex-1 px-2 py-1 text-sm border border-transparent hover:border-gray-200 focus:border-teal-400 focus:outline-none rounded bg-transparent focus:bg-white dark:focus:bg-gray-900 dark:text-gray-200"
            />
            <button
              type="button"
              onClick={() => remove(idx)}
              className="p-1 text-gray-300 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </SortableItem>
        )}
      />

      <div className="px-2 py-1.5">
        <button
          type="button"
          onClick={add}
          className="text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> New option
        </button>
      </div>
    </div>
  );
}

const SOURCE_OPTIONS = [
  { value: 'self', label: 'Self' },
  { value: 'internal_stories', label: 'Stories' },
  { value: 'internal', label: 'Datasource' },
  { value: 'external_datasource', label: 'External JSON' },
  { value: 'internal_languages', label: 'Internal languages' },
];

function SourceSubCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 mb-4 space-y-3">{children}</div>
  );
}

export function OptionSourceConfig({
  def,
  onChange,
  spaceId,
}: {
  def: OptionFieldDef | OptionsFieldDef;
  onChange: (patch: any) => void;
  spaceId?: string;
}) {
  const source = def.source ?? 'self';

  const { data: datasourcesData, isLoading: loadingDS } = useApi<{
    datasources: Array<{ slug: string; name: string }>;
  }>(source === 'internal' && spaceId ? `/api/admin/spaces/${spaceId}/datasources` : null);

  const { data: componentsData, isLoading: loadingCT } = useApi<{
    components: Array<{ name: string }>;
  }>(
    source === 'internal_stories' && spaceId
      ? `/api/admin/spaces/${spaceId}/components?per_page=500`
      : null,
  );

  const datasources = datasourcesData?.datasources ?? [];
  const components = componentsData?.components ?? [];
  const selectedCT: string[] = def.filter_content_type ?? [];
  const ctItems = components.map((c) => ({ id: c.name, label: c.name }));

  if (source === 'self') {
    return (
      <SourceSubCard>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Add options</p>
        <OptionsList options={def.options ?? []} onChange={(opts) => onChange({ options: opts })} />
        <CheckboxRow
          label="Hide empty option"
          checked={!!def.exclude_empty_option}
          onChange={(v) => onChange({ exclude_empty_option: v })}
        />
      </SourceSubCard>
    );
  }

  if (source === 'internal') {
    return (
      <SourceSubCard>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Internal datasource
        </p>
        <SelectDropdown
          value={def.datasource_slug ?? null}
          onChange={(v) => onChange({ datasource_slug: v ?? undefined })}
          options={datasources.map((ds) => ({ value: ds.slug, label: ds.name }))}
          placeholder="Choose an option"
          loading={loadingDS}
        />
      </SourceSubCard>
    );
  }

  if (source === 'internal_stories') {
    return (
      <SourceSubCard>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Path to folder of stories
            </p>
            <TooltipHint text="Restrict which stories can be selected by specifying a folder path. Example: categories/" />
          </div>
          <input
            type="text"
            value={def.link_scope ?? ''}
            onChange={(e) => onChange({ link_scope: e.target.value || undefined })}
            placeholder="Example: categories/"
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
            Restrict to content type
          </p>
          <MultiSelectPicker
            placeholder="Choose..."
            selectedIds={selectedCT}
            items={ctItems}
            loading={loadingCT}
            onToggle={(id) =>
              onChange({
                filter_content_type: selectedCT.includes(id)
                  ? selectedCT.filter((x) => x !== id)
                  : [...selectedCT, id],
              })
            }
            onClearAll={() => onChange({ filter_content_type: [] })}
          />
        </div>
        <CheckboxRow
          label="Enable advanced search"
          checked={!!def.allow_advanced_search}
          onChange={(v) => onChange({ allow_advanced_search: v || undefined })}
          tooltip="Allows searching stories by multiple fields in the editor."
        />
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Appearance</p>
            <TooltipHint text="Controls how stories are displayed in the selection dropdown." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                {
                  value: 'link',
                  label: 'Entry link',
                  icon: (
                    <svg viewBox="0 0 80 48" className="w-full h-8 mb-1" fill="none">
                      <rect x="4" y="8" width="72" height="32" rx="4" fill="#e5e7eb" />
                      <rect x="10" y="16" width="40" height="4" rx="2" fill="#9ca3af" />
                      <rect x="10" y="24" width="28" height="3" rx="1.5" fill="#d1d5db" />
                    </svg>
                  ),
                },
                {
                  value: 'card',
                  label: 'Entry card',
                  icon: (
                    <svg viewBox="0 0 80 48" className="w-full h-8 mb-1" fill="none">
                      <rect x="4" y="4" width="72" height="40" rx="4" fill="#e5e7eb" />
                      <rect x="10" y="10" width="35" height="4" rx="2" fill="#9ca3af" />
                      <rect x="10" y="18" width="25" height="3" rx="1.5" fill="#d1d5db" />
                      <rect x="50" y="10" width="18" height="22" rx="2" fill="#d1d5db" />
                    </svg>
                  ),
                },
              ] as const
            ).map(({ value, label, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ appearance: value })}
                className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${
                  (def.appearance ?? 'link') === value
                    ? 'border-teal-500 bg-white dark:bg-gray-900'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300'
                }`}
              >
                {icon}
                <span
                  className={`text-sm font-medium ${(def.appearance ?? 'link') === value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </SourceSubCard>
    );
  }

  if (source === 'external_datasource') {
    return (
      <SourceSubCard>
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">URL</p>
          <input
            type="text"
            value={def.external_datasource ?? ''}
            onChange={(e) => onChange({ external_datasource: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <CheckboxRow
          label="Hide empty option"
          checked={!!def.exclude_empty_option}
          onChange={(v) => onChange({ exclude_empty_option: v })}
        />
      </SourceSubCard>
    );
  }

  return null;
}

export function SourceSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <FormRow>
      <Label>Source</Label>
      <SelectDropdown
        value={value}
        onChange={(v) => onChange(v ?? 'self')}
        options={SOURCE_OPTIONS}
        placeholder=""
      />
    </FormRow>
  );
}
