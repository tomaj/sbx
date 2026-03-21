'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { ComponentGroup } from './group-tree'
import { SelectDropdown } from '@/components/ui/select-dropdown'

type BlockType = 'nestable' | 'content_type' | 'universal'

interface CreateBlockModalProps {
  open: boolean
  groups: ComponentGroup[]
  onConfirm: (data: {
    name: string
    description: string
    is_nestable: boolean
    is_root: boolean
    component_group_uuid: string | null
  }) => Promise<void>
  onCancel: () => void
}

export function CreateBlockModal({ open, groups, onConfirm, onCancel }: CreateBlockModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [blockType, setBlockType] = useState<BlockType>('nestable')
  const [groupUuid, setGroupUuid] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName('')
      setDescription('')
      setBlockType('nestable')
      setGroupUuid(null)
      setError(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  async function handleCreate() {
    if (!name.trim()) { setError('Technical name is required'); return }
    setSaving(true)
    setError(null)
    try {
      const isNestable = blockType === 'nestable' || blockType === 'universal'
      const isRoot = blockType === 'content_type' || blockType === 'universal'
      await onConfirm({
        name: name.trim(),
        description: description.trim(),
        is_nestable: isNestable,
        is_root: isRoot,
        component_group_uuid: groupUuid,
      })
    } catch (e: any) {
      setError(e.message ?? 'Failed to create block')
      setSaving(false)
    }
  }

  const selectedGroup = groups.find((g) => g.uuid === groupUuid)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Create new block</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Technical name */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Technical name <span className="text-red-500">*</span>
          </label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder-gray-400"
          />
          <p className="mt-1 text-xs text-blue-500">Used in the JSON as block name</p>
        </div>

        {/* Description */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder-gray-400"
          />
          <p className="mt-1 text-xs text-gray-400">Used in the editor interface only</p>
        </div>

        {/* Block type */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Select block type <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-col gap-2">
            <BlockTypeOption
              value="nestable"
              selected={blockType === 'nestable'}
              onSelect={() => setBlockType('nestable')}
              title="Nestable block"
              description="e.g. Hero, Grid, Section, Newsletter Section, Chapter, Full Width Image, Slider..."
              icon={<NestableIcon />}
            />
            <BlockTypeOption
              value="content_type"
              selected={blockType === 'content_type'}
              onSelect={() => setBlockType('content_type')}
              title="Content type block"
              description="e.g. Landing pages, Post, Authors, Product, Page, Team Members, FAQ article..."
              icon={<ContentTypeIcon />}
            />
            <BlockTypeOption
              value="universal"
              selected={blockType === 'universal'}
              onSelect={() => setBlockType('universal')}
              title="Universal block"
              description="Block that can be used as content type block and nested block at same time."
              icon={<UniversalIcon />}
            />
          </div>
        </div>

        {/* Block Folder */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Block Folder
          </label>
          <SelectDropdown
            value={groupUuid}
            onChange={setGroupUuid}
            options={groups.map((g) => ({ value: g.uuid, label: g.name }))}
            placeholder="No folder"
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            className="px-5 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Creating...' : 'Add Block'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface BlockTypeOptionProps {
  value: string
  selected: boolean
  onSelect: () => void
  title: string
  description: string
  icon: React.ReactNode
}

function BlockTypeOption({ selected, onSelect, title, description, icon }: BlockTypeOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg border transition-colors ${
        selected
          ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
        selected ? 'border-teal-600' : 'border-gray-400'
      }`}>
        {selected && <div className="w-2 h-2 rounded-full bg-teal-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      </div>
      <div className="flex-shrink-0 text-gray-400">{icon}</div>
    </button>
  )
}

function NestableIcon() {
  return (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
      <rect x="1" y="6" width="16" height="12" rx="2" fill="#94a3b8" />
      <rect x="4" y="9" width="10" height="6" rx="1" fill="#cbd5e1" />
      <rect x="23" y="6" width="16" height="12" rx="2" fill="#94a3b8" />
      <rect x="26" y="9" width="10" height="6" rx="1" fill="#cbd5e1" />
    </svg>
  )
}

function ContentTypeIcon() {
  return (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
      <rect x="5" y="3" width="30" height="18" rx="2" fill="#94a3b8" />
      <rect x="8" y="6" width="12" height="3" rx="1" fill="#cbd5e1" />
      <rect x="8" y="11" width="24" height="2" rx="1" fill="#cbd5e1" />
      <rect x="8" y="15" width="18" height="2" rx="1" fill="#cbd5e1" />
    </svg>
  )
}

function UniversalIcon() {
  return (
    <svg width="44" height="24" viewBox="0 0 44 24" fill="none">
      <rect x="1" y="6" width="14" height="12" rx="2" fill="#94a3b8" />
      <rect x="4" y="9" width="8" height="6" rx="1" fill="#cbd5e1" />
      <rect x="17" y="3" width="26" height="18" rx="2" fill="#94a3b8" />
      <rect x="20" y="6" width="10" height="3" rx="1" fill="#cbd5e1" />
      <rect x="20" y="11" width="20" height="2" rx="1" fill="#cbd5e1" />
      <rect x="20" y="15" width="14" height="2" rx="1" fill="#cbd5e1" />
    </svg>
  )
}
