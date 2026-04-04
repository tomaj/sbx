'use client';

import { useState } from 'react';
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
          loading={loadingDatasource}
        />
      </div>
    );
  }

  // Static options (source: 'self' or no source)
  const options = (def.options ?? []).map((o) => ({ value: o.value, label: o.name }));
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
      />
    </div>
  );
}
