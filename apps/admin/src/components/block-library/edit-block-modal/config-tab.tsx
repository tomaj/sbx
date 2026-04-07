'use client';

import type { ComponentGroup } from '../group-tree';
import type { WorkingField } from './types';
import { SelectDropdown } from '@/components/ui/select-dropdown';
import { TagsMultiselect } from '@/components/ui/tags-multiselect';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { FormField, inputCls } from '@/components/ui/form-field';
import { BLOCK_ICONS } from '../block-icons';
import { AssetField } from '@/components/story-editor/fields/asset-field';
import type { AssetFieldDef } from './types';

type BlockType = 'nestable' | 'content_type' | 'universal';

const PREVIEW_FIELD_TYPES = new Set(['text', 'textarea', 'option', 'number', 'markdown']);

const PRESET_COLORS = [
  '#ef6252',
  '#ff6159',
  '#ffac00',
  '#f4cc48',
  '#fbce41',
  '#2db47d',
  '#00b3b0',
  '#374dc3',
  '#395ece',
  '#dfe3e8',
];

interface ConfigTabProps {
  spaceId: string;
  displayName: string;
  description: string;
  blockType: BlockType;
  groupUuid: string | null;
  groups: ComponentGroup[];
  schemaFields: WorkingField[];
  previewField: string | null;
  previewCardField: string | null;
  previewTmpl: string;
  internalTags: { id: number; name: string }[];
  color: string | null;
  icon: string | null;
  image: string | null;
  onDisplayNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onBlockTypeChange: (v: BlockType) => void;
  onGroupUuidChange: (v: string | null) => void;
  onPreviewFieldChange: (v: string | null) => void;
  onPreviewCardFieldChange: (v: string | null) => void;
  onPreviewTmplChange: (v: string) => void;
  onInternalTagsChange: (v: { id: number; name: string }[]) => void;
  onColorChange: (v: string | null) => void;
  onIconChange: (v: string | null) => void;
  onImageChange: (v: string | null) => void;
}

export function ConfigTab({
  spaceId,
  displayName,
  description,
  blockType,
  groupUuid,
  groups,
  schemaFields,
  previewField,
  previewCardField,
  previewTmpl,
  internalTags,
  color,
  icon,
  image,
  onDisplayNameChange,
  onDescriptionChange,
  onBlockTypeChange,
  onGroupUuidChange,
  onPreviewFieldChange,
  onPreviewCardFieldChange,
  onPreviewTmplChange,
  onInternalTagsChange,
  onColorChange,
  onIconChange,
  onImageChange,
}: ConfigTabProps) {
  const previewFieldOptions = [
    { value: '', label: 'Automatic' },
    ...schemaFields
      .filter((f) => PREVIEW_FIELD_TYPES.has(f.def.type))
      .map((f) => ({ value: f.key, label: f.def.display_name || f.key })),
  ];

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
      {/* Display name */}
      <FormField label="Display name" description="Human-readable name shown in the editor">
        <input
          type="text"
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
          placeholder="My Block"
          className={inputCls}
        />
      </FormField>

      {/* Description */}
      <FormField label="Description" description="Used in the editor interface only">
        <input
          type="text"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="What this block is for..."
          className={inputCls}
        />
      </FormField>

      {/* Block type */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Block type
        </label>
        <div className="flex flex-col gap-2">
          {(
            [
              {
                value: 'nestable' as BlockType,
                title: 'Nestable block',
                desc: 'e.g. Hero, Grid, Section, Newsletter Section, Chapter, Full Width Image, Slider...',
              },
              {
                value: 'content_type' as BlockType,
                title: 'Content type block',
                desc: 'e.g. Landing pages, Post, Authors, Product, Page, Team Members, FAQ article...',
              },
              {
                value: 'universal' as BlockType,
                title: 'Universal block',
                desc: 'Block that can be used as content type block and nested block at same time.',
              },
            ] as Array<{ value: BlockType; title: string; desc: string }>
          ).map(({ value, title, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => onBlockTypeChange(value)}
              className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                blockType === value
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${blockType === value ? 'border-teal-600' : 'border-gray-400'}`}
              >
                {blockType === value && <div className="w-2 h-2 rounded-full bg-teal-600" />}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Block Folder */}
      <div>
        <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Block Folder
          <InfoTooltip text="If you select a folder, the block will be added inside that block folder. Otherwise, the block will be added inside the 'All blocks' section." />
        </label>
        <SelectDropdown
          value={groupUuid}
          onChange={onGroupUuidChange}
          options={groups.map((g) => ({ value: g.uuid, label: g.name }))}
          placeholder="No folder"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Tags
          <InfoTooltip text="Specifies a custom icon for this block to make it easier to find it" />
        </label>
        <TagsMultiselect spaceId={spaceId} value={internalTags} onChange={onInternalTagsChange} />
        <p className="mt-1 text-xs text-gray-400">
          Tags allow you to categorize components and filter blocks.
        </p>
      </div>

      {/* Preview field */}
      <FormField
        label="Preview field"
        description="Field shown as the preview text in the blocks list."
      >
        <SelectDropdown
          value={previewField ?? ''}
          onChange={(v) => onPreviewFieldChange(v || null)}
          options={previewFieldOptions}
          placeholder="Automatic"
        />
      </FormField>

      {/* Preview card */}
      <FormField
        label="Preview card"
        description="Field shown in the story card in the stories list."
      >
        <SelectDropdown
          value={previewCardField ?? ''}
          onChange={(v) => onPreviewCardFieldChange(v || null)}
          options={[
            { value: '', label: 'Select the field that will be shown in the story card' },
            ...schemaFields.map((f) => ({ value: f.key, label: f.def.display_name || f.key })),
          ]}
          placeholder="Select the field that will be shown in the story card"
        />
      </FormField>

      {/* Preview template */}
      <FormField label="Preview template">
        <textarea
          value={previewTmpl}
          onChange={(e) => onPreviewTmplChange(e.target.value)}
          rows={5}
          placeholder={'<div>{{ it.title }}</div>\n<div>{{ it.subtitle }}</div>'}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y"
        />
        <p className="mt-1 text-xs text-gray-400">
          HTML template rendered in the block row. Use{' '}
          <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{ it.fieldName }}'}</code>{' '}
          to insert field values.{' '}
          <a
            href="https://www.storyblok.com/docs/concepts/blocks#create-previews"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 dark:text-teal-400 hover:underline"
          >
            Read the docs
          </a>
        </p>
      </FormField>

      {/* Preview screenshot */}
      <AssetField
        fieldKey="image"
        def={{ type: 'asset', display_name: 'Preview screenshot' } as AssetFieldDef}
        value={image ? { filename: image } : undefined}
        onChange={(v) => onImageChange(v?.filename ?? null)}
        spaceId={spaceId}
      />

      {/* Block icon */}
      <div>
        <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Block icon
          <InfoTooltip text="Specifies a custom icon for this block to make it easier to find it" />
        </label>
        {/* Color picker */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {PRESET_COLORS.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => onColorChange(hex)}
              style={{ backgroundColor: hex }}
              className={`w-7 h-7 rounded-full transition-all ${
                color === hex ? 'ring-2 ring-offset-2 ring-teal-500' : 'hover:scale-110'
              }`}
              title={hex}
            />
          ))}
          <button
            type="button"
            onClick={() => {
              onColorChange(null);
              onIconChange(null);
            }}
            className="text-xs text-teal-600 dark:text-teal-400 hover:underline ml-1"
          >
            Use default
          </button>
        </div>
        {/* Icon picker grid */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <div className="grid grid-cols-9 gap-1">
            {BLOCK_ICONS.map(({ name, icon: Icon }) => (
              <button
                key={name}
                type="button"
                onClick={() => onIconChange(name === icon ? null : name)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                  icon === name
                    ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title={name}
              >
                <Icon className="w-5 h-5" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
