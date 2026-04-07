'use client';

import { useApi } from '@/lib/swr';
import { FormRow, Label, CheckboxRow, SectionTitle } from '../form-primitives';
import { MultiSelectPicker } from '../multi-select-picker';

export function ReferencesOptions({
  def,
  onChange,
  spaceId,
}: {
  def: any;
  onChange: (patch: any) => void;
  spaceId?: string;
}) {
  const { data: componentsData, isLoading: loading } = useApi<{
    components: Array<{ name: string }>;
  }>(spaceId ? `/api/admin/spaces/${spaceId}/components?per_page=500` : null);

  const components = componentsData?.components ?? [];
  const componentItems = components.map((c) => ({ id: c.name, label: c.name }));
  const selected: string[] = def.component_whitelist ?? [];

  return (
    <>
      <SectionTitle>References Field Options</SectionTitle>
      <CheckboxRow
        label="Enable advanced search"
        checked={def.enable_advanced_search !== false}
        onChange={(v) => onChange({ enable_advanced_search: v })}
        tooltip="Allows searching stories by multiple fields"
      />
      <CheckboxRow
        label="Restrict to content types"
        checked={!!def.restrict_content_types}
        onChange={(v) => onChange({ restrict_content_types: v || undefined })}
      />
      {def.restrict_content_types && (
        <FormRow>
          <Label>Content type whitelist</Label>
          <MultiSelectPicker
            placeholder="Choose..."
            selectedIds={selected}
            items={componentItems}
            loading={loading}
            onToggle={(id) =>
              onChange({
                component_whitelist: selected.includes(id)
                  ? selected.filter((x: string) => x !== id)
                  : [...selected, id],
              })
            }
            onClearAll={() => onChange({ component_whitelist: [] })}
          />
        </FormRow>
      )}
      <CheckboxRow
        label="Force folder restriction"
        checked={!!def.force_link_scope}
        onChange={(v) => onChange({ force_link_scope: v || undefined })}
      />
      <FormRow>
        <Label>Restrict to folder</Label>
        <input
          type="text"
          value={def.link_scope ?? ''}
          onChange={(e) => onChange({ link_scope: e.target.value || undefined })}
          placeholder="Example: categories/"
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <p className="mt-1 text-xs text-gray-400">
          With {'{0}'} the path will be replaced dynamically using parts of the current slug.
          Examples: {'{0}'}/categories/, {'{0}'}/{'{1}'}/categories/
        </p>
      </FormRow>
    </>
  );
}
