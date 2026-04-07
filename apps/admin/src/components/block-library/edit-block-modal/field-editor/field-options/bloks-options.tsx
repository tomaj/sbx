'use client';

import { useState } from 'react';
import { useApi } from '@/lib/swr';
import { type BloksFieldDef } from '../../types';
import type { ComponentGroup } from '../../../group-tree';
import { FormRow, Label, CheckboxRow, NumberStepper, SectionTitle } from '../form-primitives';
import { MultiSelectPicker, ModeDropdown } from '../multi-select-picker';

type BloksTab = 'blocks' | 'folders' | 'tags';

export function BloksOptions({
  def,
  onChange,
  spaceId,
  groups,
}: {
  def: BloksFieldDef;
  onChange: (patch: Partial<BloksFieldDef>) => void;
  spaceId?: string;
  groups: ComponentGroup[];
}) {
  const [activeTab, setActiveTab] = useState<BloksTab>('blocks');

  const { data: componentsData, isLoading: loadingComponents } = useApi<{
    components: Array<{ name: string; display_name?: string; component_group_uuid?: string }>;
  }>(
    def.restrict_components && spaceId
      ? `/api/admin/spaces/${spaceId}/components?per_page=500`
      : null,
  );

  const { data: tagsData, isLoading: loadingTags } = useApi<{ tags: Array<any> }>(
    def.restrict_components && spaceId ? `/api/admin/spaces/${spaceId}/tags` : null,
  );

  const components = componentsData?.components ?? [];
  const tags = (tagsData?.tags ?? []).map((t: any) => t.name ?? t);

  const blocksMode: 'allow' | 'deny' =
    (def.component_denylist?.length ?? 0) > 0 && !def.component_whitelist?.length
      ? 'deny'
      : 'allow';
  const foldersMode: 'allow' | 'deny' =
    (def.component_group_denylist?.length ?? 0) > 0 && !def.component_group_whitelist?.length
      ? 'deny'
      : 'allow';
  const tagsMode: 'allow' | 'deny' =
    (def.component_tag_denylist?.length ?? 0) > 0 && !def.component_tag_whitelist?.length
      ? 'deny'
      : 'allow';

  // Auto-derive restrict_type: 'groups' when only group filters are set, '' otherwise
  function withRestrictType(patch: Partial<BloksFieldDef>): Partial<BloksFieldDef> {
    const merged = { ...def, ...patch };
    const hasBlockFilter =
      (merged.component_whitelist?.length ?? 0) > 0 || (merged.component_denylist?.length ?? 0) > 0;
    const hasGroupFilter =
      (merged.component_group_whitelist?.length ?? 0) > 0 ||
      (merged.component_group_denylist?.length ?? 0) > 0;
    const restrict_type: '' | 'groups' = !hasBlockFilter && hasGroupFilter ? 'groups' : '';
    return { ...patch, restrict_type };
  }

  const componentItems = components.map((c) => {
    const group = groups.find((g) => g.uuid === c.component_group_uuid);
    return { id: c.name, label: c.name, sublabel: group ? `/${group.name}` : undefined };
  });

  const groupItems = groups.map((g) => ({ id: g.uuid, label: g.name, sublabel: `/${g.name}` }));
  const tagItems = tags.map((t) => ({ id: t, label: t }));

  return (
    <>
      <SectionTitle>Blocks Field Options</SectionTitle>
      <FormRow>
        <CheckboxRow
          label="Manage access to nestable blocks"
          checked={!!def.restrict_components}
          onChange={(v) => onChange({ restrict_components: v || undefined })}
          tooltip="When enabled, you can restrict which blocks can be inserted into this field."
        />
      </FormRow>

      {def.restrict_components && (
        <>
          <div className="flex mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            {(['blocks', 'folders', 'tags'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTab(t)}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                  activeTab === t
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Access management
          </p>

          {activeTab === 'blocks' && (
            <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-visible">
              <ModeDropdown
                mode={blocksMode}
                onChange={(m) => {
                  const current =
                    m === 'allow'
                      ? (def.component_denylist ?? [])
                      : (def.component_whitelist ?? []);
                  if (m === 'allow')
                    onChange(
                      withRestrictType({ component_whitelist: current, component_denylist: [] }),
                    );
                  else
                    onChange(
                      withRestrictType({ component_denylist: current, component_whitelist: [] }),
                    );
                }}
              />
              <MultiSelectPicker
                placeholder="Select blocks"
                selectedIds={
                  blocksMode === 'allow'
                    ? (def.component_whitelist ?? [])
                    : (def.component_denylist ?? [])
                }
                items={componentItems}
                loading={loadingComponents}
                onToggle={(id) => {
                  const key = blocksMode === 'allow' ? 'component_whitelist' : 'component_denylist';
                  const current = (def[key] ?? []) as string[];
                  onChange(
                    withRestrictType({
                      [key]: current.includes(id)
                        ? current.filter((x) => x !== id)
                        : [...current, id],
                    }),
                  );
                }}
                onClearAll={() => {
                  const key = blocksMode === 'allow' ? 'component_whitelist' : 'component_denylist';
                  onChange(withRestrictType({ [key]: [] }));
                }}
              />
            </div>
          )}

          {activeTab === 'folders' && (
            <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-visible">
              <ModeDropdown
                mode={foldersMode}
                onChange={(m) => {
                  const current =
                    m === 'allow'
                      ? (def.component_group_denylist ?? [])
                      : (def.component_group_whitelist ?? []);
                  if (m === 'allow')
                    onChange(
                      withRestrictType({
                        component_group_whitelist: current,
                        component_group_denylist: [],
                      }),
                    );
                  else
                    onChange(
                      withRestrictType({
                        component_group_denylist: current,
                        component_group_whitelist: [],
                      }),
                    );
                }}
              />
              <MultiSelectPicker
                placeholder="Select folders"
                selectedIds={
                  foldersMode === 'allow'
                    ? (def.component_group_whitelist ?? [])
                    : (def.component_group_denylist ?? [])
                }
                items={groupItems}
                onToggle={(id) => {
                  const key =
                    foldersMode === 'allow'
                      ? 'component_group_whitelist'
                      : 'component_group_denylist';
                  const current = (def[key] ?? []) as string[];
                  onChange(
                    withRestrictType({
                      [key]: current.includes(id)
                        ? current.filter((x) => x !== id)
                        : [...current, id],
                    }),
                  );
                }}
                onClearAll={() => {
                  const key =
                    foldersMode === 'allow'
                      ? 'component_group_whitelist'
                      : 'component_group_denylist';
                  onChange(withRestrictType({ [key]: [] }));
                }}
              />
            </div>
          )}

          {activeTab === 'tags' && (
            <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-visible">
              <ModeDropdown
                mode={tagsMode}
                onChange={(m) => {
                  const current =
                    m === 'allow'
                      ? (def.component_tag_denylist ?? [])
                      : (def.component_tag_whitelist ?? []);
                  if (m === 'allow')
                    onChange({ component_tag_whitelist: current, component_tag_denylist: [] });
                  else onChange({ component_tag_denylist: current, component_tag_whitelist: [] });
                }}
              />
              <MultiSelectPicker
                placeholder="Select tags"
                selectedIds={
                  tagsMode === 'allow'
                    ? (def.component_tag_whitelist ?? [])
                    : (def.component_tag_denylist ?? [])
                }
                items={tagItems}
                loading={loadingTags}
                onToggle={(id) => {
                  const key =
                    tagsMode === 'allow' ? 'component_tag_whitelist' : 'component_tag_denylist';
                  const current = (def[key] ?? []) as string[];
                  onChange({
                    [key]: current.includes(id)
                      ? current.filter((x) => x !== id)
                      : [...current, id],
                  });
                }}
                onClearAll={() => {
                  const key =
                    tagsMode === 'allow' ? 'component_tag_whitelist' : 'component_tag_denylist';
                  onChange({ [key]: [] });
                }}
              />
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-4">
            <FormRow>
              <Label>Minimum blocks</Label>
              <NumberStepper
                value={def.minimum}
                onChange={(v) => onChange({ minimum: v })}
                min={0}
              />
            </FormRow>
            <FormRow>
              <Label>Maximum blocks</Label>
              <NumberStepper
                value={def.maximum}
                onChange={(v) => onChange({ maximum: v })}
                min={0}
              />
            </FormRow>
          </div>
        </>
      )}

      {!def.restrict_components && (
        <div className="mt-2 grid grid-cols-2 gap-4">
          <FormRow>
            <Label>Minimum blocks</Label>
            <NumberStepper value={def.minimum} onChange={(v) => onChange({ minimum: v })} min={0} />
          </FormRow>
          <FormRow>
            <Label>Maximum blocks</Label>
            <NumberStepper value={def.maximum} onChange={(v) => onChange({ maximum: v })} min={0} />
          </FormRow>
        </div>
      )}
    </>
  );
}
