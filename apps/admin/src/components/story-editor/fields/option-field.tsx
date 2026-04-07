'use client';

import { useState, useEffect } from 'react';
import { useApi } from '@/lib/swr';
import { ChevronDown } from 'lucide-react';
import type { OptionFieldDef } from '@/components/block-library/edit-block-modal/types';
import { fieldLabel } from '../field-label';
import { FieldLabel } from '../FieldLabel';
import { StoryPickerModal } from '../StoryPickerModal';
import { SelectDropdown } from '@/components/ui/select-dropdown';

interface Props {
  fieldKey: string;
  def: OptionFieldDef;
  value: string | undefined;
  onChange: (v: string) => void;
  spaceId: string;
}

export function OptionField({ fieldKey, def, value, onChange, spaceId }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const isInternalStories = def.source === 'internal_stories';
  const isInternalDatasource = def.source === 'internal' && !!def.datasource_slug;
  const isExternalDatasource = def.source === 'external_datasource' && !!def.external_datasource;

  // For external datasource: fetch options from the configured URL
  const [externalOptions, setExternalOptions] = useState<Array<{
    value: string;
    label: string;
  }> | null>(null);
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
        setExternalOptions(
          raw.map((o) => ({
            value: String(o.value ?? ''),
            label: String(o.name ?? o.value ?? ''),
          })),
        );
      })
      .catch(() => setExternalError('Failed to load options'))
      .finally(() => setExternalLoading(false));
  }, [isExternalDatasource, def.external_datasource]);

  // For internal_stories: fetch the display name of current value
  const storyLabelParams = (() => {
    if (!isInternalStories || !value) return null;
    const params = new URLSearchParams({ per_page: '1' });
    if (def.use_uuid) params.set('uuid', value);
    else params.set('story_id', value);
    if (def.filter_content_type?.length) params.set('content_type', def.filter_content_type[0]);
    return params.toString();
  })();
  const { data: storyLabelData } = useApi<{ stories: Array<{ name: string }> }>(
    storyLabelParams ? `/api/admin/spaces/${spaceId}/stories?${storyLabelParams}` : null,
  );
  const selectedLabel = storyLabelData
    ? (storyLabelData.stories?.[0]?.name ?? value ?? null)
    : null;

  // For internal datasource: first fetch the datasource list to get the id
  const { data: datasourcesData, isLoading: loadingDatasources } = useApi<{
    datasources: Array<{ id: number; slug: string }>;
  }>(isInternalDatasource ? `/api/admin/spaces/${spaceId}/datasources` : null);
  const datasourceId =
    datasourcesData?.datasources?.find((d) => d.slug === def.datasource_slug)?.id ?? null;

  // Then fetch entries using the resolved id
  const { data: entriesData, isLoading: loadingEntries } = useApi<{
    entries: Array<{ value: string; name: string }>;
  }>(
    isInternalDatasource && datasourceId !== null
      ? `/api/admin/spaces/${spaceId}/datasources/${datasourceId}/entries?per_page=500`
      : null,
  );
  const loadingDatasource = loadingDatasources || loadingEntries;
  const datasourceOptions =
    entriesData?.entries?.map((e) => ({ value: e.value, label: e.name })) ?? null;

  if (isInternalStories) {
    return (
      <>
        <div>
          <FieldLabel
            label={fieldLabel(def.display_name, fieldKey)}
            required={def.required}
            description={def.description}
          />
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
          >
            <span className={selectedLabel ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}>
              {selectedLabel ?? 'Choose an option'}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </button>
        </div>

        {pickerOpen && (
          <StoryPickerModal
            spaceId={spaceId}
            title={fieldLabel(def.display_name, fieldKey)}
            filterContentType={def.filter_content_type}
            useUuid={def.use_uuid}
            value={value}
            onSelect={(v) => {
              onChange(v);
            }}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </>
    );
  }

  if (isExternalDatasource) {
    return (
      <div>
        <FieldLabel
          label={fieldLabel(def.display_name, fieldKey)}
          required={def.required}
          description={def.description}
        />
        {externalError ? (
          <p className="text-xs text-red-500 mt-1">{externalError}</p>
        ) : (
          <SelectDropdown
            options={externalOptions ?? []}
            value={value}
            onChange={(v) => onChange(v ?? '')}
            placeholder="Choose an option"
            noPlaceholder={def.exclude_empty_option}
            loading={externalLoading}
          />
        )}
      </div>
    );
  }

  if (isInternalDatasource) {
    return (
      <div>
        <FieldLabel
          label={fieldLabel(def.display_name, fieldKey)}
          required={def.required}
          description={def.description}
        />
        <SelectDropdown
          options={datasourceOptions ?? []}
          value={value}
          onChange={(v) => onChange(v ?? '')}
          placeholder="Choose an option"
          noPlaceholder={def.exclude_empty_option}
          loading={loadingDatasource}
        />
      </div>
    );
  }

  // Static options (source: 'self' or no source)
  const options = (def.options ?? []).map((o) => ({ value: o.value, label: o.name }));

  // Radio button appearance
  if (def.appearance === 'link') {
    return (
      <div>
        <FieldLabel
          label={fieldLabel(def.display_name, fieldKey)}
          required={def.required}
          description={def.description}
        />
        <div className="flex flex-col gap-1.5">
          {!def.exclude_empty_option && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`option-${fieldKey}`}
                checked={!value}
                onChange={() => onChange('')}
                className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400 italic">None</span>
            </label>
          )}
          {options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`option-${fieldKey}`}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
                className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  // Card appearance
  if (def.appearance === 'card') {
    return (
      <div>
        <FieldLabel
          label={fieldLabel(def.display_name, fieldKey)}
          required={def.required}
          description={def.description}
        />
        <div className="grid grid-cols-2 gap-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(value === opt.value ? '' : opt.value)}
              className={`px-3 py-2.5 text-sm text-left rounded-lg border transition-colors ${
                value === opt.value
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 font-medium'
                  : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Default: dropdown
  return (
    <div>
      <FieldLabel
        label={fieldLabel(def.display_name, fieldKey)}
        required={def.required}
        description={def.description}
      />
      <SelectDropdown
        options={options}
        value={value}
        onChange={(v) => onChange(v ?? '')}
        placeholder="Choose an option"
        noPlaceholder={def.exclude_empty_option}
      />
    </div>
  );
}
