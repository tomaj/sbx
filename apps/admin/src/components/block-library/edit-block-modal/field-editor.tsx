'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import {
  type AnyFieldDef,
  type FieldType,
  type OptionFieldDef,
  type OptionsFieldDef,
  type BloksFieldDef,
  type WorkingField,
} from './types';
import type { ComponentGroup } from '../group-tree';
import { FormRow, Label, CheckboxRow, TooltipHint } from './field-editor/form-primitives';
import { FieldTypeSelector } from './field-editor/field-type-selector';
import { FieldConditionsSection } from './field-editor/field-conditions';
import { TextOptions, TextareaOptions } from './field-editor/field-options/text-options';
import { RichtextOptions, MarkdownOptions } from './field-editor/field-options/richtext-options';
import {
  NumberOptions,
  DatetimeOptions,
  BooleanOptions,
} from './field-editor/field-options/number-options';
import {
  SingleOptionOptions,
  MultiOptionsOptions,
} from './field-editor/field-options/option-options';
import { ReferencesOptions } from './field-editor/field-options/references-options';
import { AssetOptions } from './field-editor/field-options/asset-options';
import { LinkOptions } from './field-editor/field-options/link-options';
import { GroupOptions } from './field-editor/field-options/group-options';
import { BloksOptions } from './field-editor/field-options/bloks-options';

interface FieldEditorProps {
  field: WorkingField;
  allFields: WorkingField[];
  spaceId?: string;
  groups?: ComponentGroup[];
  onSave: (key: string, updatedDef: AnyFieldDef) => void;
  onBack: () => void;
}

export function FieldEditor({
  field,
  allFields,
  spaceId,
  groups = [],
  onSave,
  onBack,
}: FieldEditorProps) {
  const [def, setDef] = useState<AnyFieldDef>({ ...field.def });
  const [editingKey, setEditingKey] = useState(false);
  const [keyValue, setKeyValue] = useState(field.key);

  function patch(updates: any) {
    setDef((prev) => ({ ...prev, ...updates }));
  }

  function handleSave() {
    onSave(keyValue, def);
  }

  const type = def.type as FieldType;
  const commonHasRequired = !['table', 'section', 'boolean'].includes(type);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <FieldTypeSelector value={type} onChange={(t) => setDef({ type: t } as AnyFieldDef)} />

        <FormRow>
          <Label>Display name</Label>
          <input
            type="text"
            value={(def as any).display_name ?? ''}
            onChange={(e) => patch({ display_name: e.target.value || undefined })}
            placeholder={field.key}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </FormRow>

        <FormRow>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Field name
            </span>
            <TooltipHint text="Technical name used in the API response JSON. Cannot contain spaces. Example: news_items, hero_title." />
          </div>
          {editingKey ? (
            <input
              type="text"
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value.replace(/\s/g, '_').toLowerCase())}
              onBlur={() => setEditingKey(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setEditingKey(false);
              }}
              className="w-full px-3 py-2 border border-teal-400 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          ) : (
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <span className="text-sm font-mono text-gray-500 dark:text-gray-400">{keyValue}</span>
              <button
                type="button"
                onClick={() => setEditingKey(true)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </FormRow>

        {commonHasRequired && (
          <CheckboxRow
            label="Required field"
            checked={!!(def as any).required}
            onChange={(v) => patch({ required: v || undefined })}
            tooltip="If enabled, the field must have a value before the story can be published."
          />
        )}

        <CheckboxRow
          label="Translatable"
          checked={!!(def as any).translatable}
          onChange={(v) => patch({ translatable: v || undefined })}
          tooltip="Defines if the field can be translated using the field level translations feature. Enable this feature by adding languages in the space settings area."
        />

        <FormRow>
          <Label>Description</Label>
          <textarea
            value={(def as any).description ?? ''}
            onChange={(e) => patch({ description: e.target.value || undefined })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
          />
        </FormRow>

        <CheckboxRow
          label="Show the description as a tooltip"
          checked={!!(def as any).tooltip}
          onChange={(v) => patch({ tooltip: v || undefined })}
          tooltip="If this option is selected, the description will be in a tooltip right after the field name. If this option is not selected, the description will be in a note under the field."
        />

        {type === 'bloks' && (
          <BloksOptions
            def={def as BloksFieldDef}
            onChange={patch}
            spaceId={spaceId}
            groups={groups}
          />
        )}
        {type === 'text' && <TextOptions def={def} onChange={patch} />}
        {type === 'textarea' && <TextareaOptions def={def} onChange={patch} />}
        {type === 'richtext' && <RichtextOptions def={def} onChange={patch} />}
        {type === 'markdown' && <MarkdownOptions def={def} onChange={patch} />}
        {type === 'number' && <NumberOptions def={def} onChange={patch} />}
        {type === 'datetime' && <DatetimeOptions def={def} onChange={patch} />}
        {type === 'boolean' && <BooleanOptions def={def} onChange={patch} />}
        {type === 'option' && (
          <SingleOptionOptions def={def as OptionFieldDef} onChange={patch} spaceId={spaceId} />
        )}
        {type === 'options' && (
          <MultiOptionsOptions def={def as OptionsFieldDef} onChange={patch} spaceId={spaceId} />
        )}
        {type === 'multilink' && <ReferencesOptions def={def} onChange={patch} spaceId={spaceId} />}
        {(type === 'asset' || type === 'multiasset') && (
          <AssetOptions def={def} onChange={patch} spaceId={spaceId} />
        )}
        {type === 'link' && <LinkOptions def={def} onChange={patch} spaceId={spaceId} />}
        {type === 'section' && (
          <GroupOptions def={def} allFields={allFields} currentKey={keyValue} onChange={patch} />
        )}

        {type !== 'tab' && (
          <FieldConditionsSection
            conditions={(def as any).conditions}
            allFields={allFields}
            currentKey={keyValue}
            onChange={(c) => patch({ conditions: c })}
          />
        )}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 px-8 py-4 flex justify-end">
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
        >
          Save &amp; Back to Fields
        </button>
      </div>
    </div>
  );
}
