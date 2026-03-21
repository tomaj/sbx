'use client'

import type { ComponentGroup } from '../group-tree'
import { SelectDropdown } from '@/components/ui/select-dropdown'

type BlockType = 'nestable' | 'content_type' | 'universal'

interface ConfigTabProps {
  displayName: string
  description: string
  blockType: BlockType
  groupUuid: string | null
  groups: ComponentGroup[]
  onDisplayNameChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  onBlockTypeChange: (v: BlockType) => void
  onGroupUuidChange: (v: string | null) => void
}

export function ConfigTab({
  displayName,
  description,
  blockType,
  groupUuid,
  groups,
  onDisplayNameChange,
  onDescriptionChange,
  onBlockTypeChange,
  onGroupUuidChange,
}: ConfigTabProps) {
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
              {
                value: 'nestable' as BlockType,
                title: 'Nestable block',
                desc: 'e.g. Hero, Grid, Section, Newsletter Section...',
              },
              {
                value: 'content_type' as BlockType,
                title: 'Content type block',
                desc: 'e.g. Landing pages, Post, Authors, Product...',
              },
              {
                value: 'universal' as BlockType,
                title: 'Universal block',
                desc: 'Can be used as both content type and nested block.',
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
                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  blockType === value ? 'border-teal-600' : 'border-gray-400'
                }`}
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
    </div>
  )
}
