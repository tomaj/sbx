'use client'

import { useState, useRef } from 'react'
import { X } from 'lucide-react'
import type { ComponentGroup } from '../group-tree'
import type { WorkingField } from './types'
import { SelectDropdown } from '@/components/ui/select-dropdown'

type BlockType = 'nestable' | 'content_type' | 'universal'

const PREVIEW_FIELD_TYPES = new Set(['text', 'textarea', 'option', 'number', 'markdown'])

const PRESET_COLORS = [
  '#ef6252', '#ff6159', '#ffac00', '#f4cc48', '#fbce41',
  '#2db47d', '#00b3b0', '#374dc3', '#395ece', '#dfe3e8',
]

interface ConfigTabProps {
  displayName: string
  description: string
  blockType: BlockType
  groupUuid: string | null
  groups: ComponentGroup[]
  schemaFields: WorkingField[]
  previewField: string | null
  previewTmpl: string
  internalTags: string[]
  color: string | null
  onDisplayNameChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  onBlockTypeChange: (v: BlockType) => void
  onGroupUuidChange: (v: string | null) => void
  onPreviewFieldChange: (v: string | null) => void
  onPreviewTmplChange: (v: string) => void
  onInternalTagsChange: (v: string[]) => void
  onColorChange: (v: string | null) => void
}

export function ConfigTab({
  displayName,
  description,
  blockType,
  groupUuid,
  groups,
  schemaFields,
  previewField,
  previewTmpl,
  internalTags,
  color,
  onDisplayNameChange,
  onDescriptionChange,
  onBlockTypeChange,
  onGroupUuidChange,
  onPreviewFieldChange,
  onPreviewTmplChange,
  onInternalTagsChange,
  onColorChange,
}: ConfigTabProps) {
  const [tagInput, setTagInput] = useState('')
  const tagInputRef = useRef<HTMLInputElement>(null)

  const previewFieldOptions = [
    { value: '', label: 'Automatic' },
    ...schemaFields
      .filter((f) => PREVIEW_FIELD_TYPES.has(f.def.type))
      .map((f) => ({ value: f.key, label: f.def.display_name || f.key })),
  ]

  function addTag(name: string) {
    const trimmed = name.trim()
    if (!trimmed || internalTags.includes(trimmed)) return
    onInternalTagsChange([...internalTags, trimmed])
  }

  function removeTag(name: string) {
    onInternalTagsChange(internalTags.filter((t) => t !== name))
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
      setTagInput('')
    } else if (e.key === 'Backspace' && tagInput === '' && internalTags.length > 0) {
      removeTag(internalTags[internalTags.length - 1])
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
      {/* Display name */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Display name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
          placeholder="My Block"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <p className="mt-1 text-xs text-gray-400">Human-readable name shown in the editor</p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="What this block is for..."
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <p className="mt-1 text-xs text-gray-400">Used in the editor interface only</p>
      </div>

      {/* Block type */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Block type
        </label>
        <div className="flex flex-col gap-2">
          {(
            [
              { value: 'nestable' as BlockType, title: 'Nestable block', desc: 'e.g. Hero, Grid, Section, Newsletter Section...' },
              { value: 'content_type' as BlockType, title: 'Content type block', desc: 'e.g. Landing pages, Post, Authors, Product...' },
              { value: 'universal' as BlockType, title: 'Universal block', desc: 'Can be used as both content type and nested block.' },
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
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${blockType === value ? 'border-teal-600' : 'border-gray-400'}`}>
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
        <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Block Folder
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
        <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Tags
        </label>
        <div
          className="min-h-[38px] w-full px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 flex flex-wrap gap-1.5 items-center cursor-text focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500"
          onClick={() => tagInputRef.current?.focus()}
        >
          {internalTags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
            >
              {tag}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            ref={tagInputRef}
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={() => { if (tagInput.trim()) { addTag(tagInput); setTagInput('') } }}
            placeholder={internalTags.length === 0 ? 'Choose existing or add new' : ''}
            className="flex-1 min-w-[120px] bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none"
          />
        </div>
        <p className="mt-1 text-xs text-gray-400">Tags allow you to categorize components and filter blocks.</p>
      </div>

      {/* Preview field */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Preview field
        </label>
        <SelectDropdown
          value={previewField ?? ''}
          onChange={(v) => onPreviewFieldChange(v || null)}
          options={previewFieldOptions}
          placeholder="Automatic"
        />
        <p className="mt-1 text-xs text-gray-400">
          Field shown as the preview text in the blocks list.
        </p>
      </div>

      {/* Preview template */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Preview template
        </label>
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
      </div>

      {/* Block color */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Block color
        </label>
        <div className="flex items-center gap-2 flex-wrap mb-2">
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
            onClick={() => onColorChange(null)}
            className="text-xs text-teal-600 dark:text-teal-400 hover:underline ml-1"
          >
            Use default
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color?.startsWith('#') ? color : '#000000'}
            onChange={(e) => onColorChange(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-gray-200 dark:border-gray-600"
          />
          <input
            type="text"
            value={color ?? ''}
            onChange={(e) => onColorChange(e.target.value || null)}
            placeholder="#000000 or CSS value"
            className="flex-1 px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>
    </div>
  )
}
