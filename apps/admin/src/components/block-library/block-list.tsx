'use client'

import { useState, useRef } from 'react'
import { LayoutTemplate } from 'lucide-react'
import type { ComponentGroup } from './group-tree'

export interface Block {
  id: number
  name: string
  display_name: string | null
  description: string
  image: string | null
  component_group_uuid: string | null
  color: string | null
  icon: string | null
  is_root: boolean
  is_nestable: boolean
  created_at: string
  updated_at: string
  schema: Record<string, any>
  preview_field: string | null
  preview_tmpl: string | null
  internal_tags_list: { id: string | number; name: string }[]
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

function BlockType({ is_root, is_nestable }: { is_root: boolean; is_nestable: boolean }) {
  if (is_root) {
    return (
      <span className="px-2 py-0.5 text-xs rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium whitespace-nowrap">
        Universal
      </span>
    )
  }
  if (is_nestable) {
    return (
      <span className="px-2 py-0.5 text-xs rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium whitespace-nowrap">
        Nestable
      </span>
    )
  }
  return (
    <span className="px-2 py-0.5 text-xs rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
      Block
    </span>
  )
}

interface BlockRowProps {
  block: Block
  group: ComponentGroup | undefined
  selected: boolean
  onToggle: (id: number) => void
  onEdit: (block: Block) => void
}

function BlockRow({ block, group, selected, onToggle, onEdit }: BlockRowProps) {
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number } | null>(null)
  const thumbRef = useRef<HTMLDivElement>(null)

  function handleThumbEnter() {
    if (!block.image || !thumbRef.current) return
    const rect = thumbRef.current.getBoundingClientRect()
    setPreviewPos({ x: rect.right + 8, y: rect.top + rect.height / 2 })
  }

  return (
    <div
      className={`relative flex items-center gap-4 py-2.5 px-3 border-b border-gray-100 dark:border-gray-800/60 transition-colors ${
        selected
          ? 'bg-teal-50 dark:bg-teal-950/40'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(block.id)}
        className="w-4 h-4 shrink-0 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
      />

      {/* Preview thumbnail */}
      <div
        ref={thumbRef}
        className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: block.color ?? '#e5e7eb' }}
        onMouseEnter={handleThumbEnter}
        onMouseLeave={() => setPreviewPos(null)}
      >
        {block.image ? (
          <img src={block.image} alt={block.display_name ?? block.name} className="w-full h-full object-cover" />
        ) : (
          <LayoutTemplate className="w-5 h-5 text-white/80" />
        )}
      </div>

      {/* Hover preview — fixed so overflow parents don't clip it */}
      {previewPos && block.image && (
        <div
          className="pointer-events-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-2"
          style={{ position: 'fixed', left: previewPos.x, top: previewPos.y, transform: 'translateY(-50%)', zIndex: 9999 }}
        >
          <img src={block.image} alt={block.display_name ?? block.name} className="w-52 h-auto object-contain rounded-lg" />
        </div>
      )}

      {/* Name — clickable to edit */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(block)}>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
          {block.display_name || block.name}
        </p>
        <p className="text-xs text-gray-400 truncate font-mono">{block.name}</p>
      </div>

      {/* Type */}
      <div className="w-28 shrink-0 hidden lg:block">
        <BlockType is_root={block.is_root} is_nestable={block.is_nestable} />
      </div>

      {/* Folder (group) */}
      <span className="text-sm w-36 shrink-0 truncate hidden md:block">
        {group?.name
          ? <span className="text-gray-500 dark:text-gray-400">{group.name}</span>
          : <span className="italic text-gray-300 dark:text-gray-600">no group</span>}
      </span>

      {/* Updated at */}
      <span className="text-sm text-gray-400 w-24 shrink-0 text-right hidden xl:block">
        {formatDate(block.updated_at)}
      </span>
    </div>
  )
}

interface BlockListProps {
  blocks: Block[]
  groups: ComponentGroup[]
  isLoading?: boolean
  selectedIds: Set<number>
  onSelectionChange: (ids: Set<number>) => void
  onEdit: (block: Block) => void
}

export function BlockList({ blocks, groups, isLoading, selectedIds, onSelectionChange, onEdit }: BlockListProps) {
  const groupMap = new Map(groups.map((g) => [g.uuid, g]))
  const allSelected = blocks.length > 0 && blocks.every((b) => selectedIds.has(b.id))

  function toggleAll() {
    if (allSelected) {
      const next = new Set(selectedIds)
      blocks.forEach((b) => next.delete(b.id))
      onSelectionChange(next)
    } else {
      const next = new Set(selectedIds)
      blocks.forEach((b) => next.add(b.id))
      onSelectionChange(next)
    }
  }

  function toggleOne(id: number) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectionChange(next)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-3 py-2.5 border-b border-gray-100 dark:border-gray-800/60">
            <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-800 animate-pulse shrink-0" />
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse shrink-0" />
            <div className="flex-1">
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-48 mb-1.5" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-32" />
            </div>
            <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-20 hidden lg:block" />
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-28 hidden md:block" />
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-20 hidden xl:block" />
          </div>
        ))}
      </div>
    )
  }

  if (blocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <LayoutTemplate className="w-10 h-10 mb-3 text-gray-300 dark:text-gray-700" />
        <p className="text-sm">No blocks found</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-3 py-2 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-400 uppercase tracking-wide">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="w-4 h-4 shrink-0 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
        />
        <div className="w-10 shrink-0" />
        <span className="flex-1">Name</span>
        <span className="w-28 shrink-0 hidden lg:block">Type</span>
        <span className="w-36 shrink-0 hidden md:block">Folder</span>
        <span className="w-24 shrink-0 text-right hidden xl:block">Updated</span>
      </div>

      {blocks.map((block) => (
        <BlockRow
          key={block.id}
          block={block}
          group={block.component_group_uuid ? groupMap.get(block.component_group_uuid) : undefined}
          selected={selectedIds.has(block.id)}
          onToggle={toggleOne}
          onEdit={onEdit}
        />
      ))}
    </div>
  )
}
