'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2, GripVertical, Copy, Scissors } from 'lucide-react'
function uuidv4() {
  return crypto.randomUUID()
}
import type { BloksFieldDef } from '@/components/block-library/edit-block-modal/types'
import type { ComponentMeta } from '../types'
import { FieldRenderer } from '../field-renderer'

interface BlockItem {
  _uid: string
  component: string
  [key: string]: any
}

interface Props {
  fieldKey: string
  def: BloksFieldDef
  value: BlockItem[] | undefined
  onChange: (v: BlockItem[]) => void
  allComponents: ComponentMeta[]
}

function getBlockPreview(block: BlockItem, schema: Record<string, any> | undefined): string {
  if (!schema) return ''
  const entries = Object.entries(schema)
    .filter(([, def]) => def.type === 'text' || def.type === 'textarea')
    .sort(([, a], [, b]) => (a.pos ?? 0) - (b.pos ?? 0))
  if (entries.length > 0) {
    const [key] = entries[0]
    const val = block[key]
    if (typeof val === 'string' && val.length > 0) return val
  }
  return ''
}

interface BlockRowProps {
  block: BlockItem
  allComponents: ComponentMeta[]
  onUpdate: (block: BlockItem) => void
  onRemove: () => void
  onDuplicate: () => void
  isDragging: boolean
  isDragOver: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
}

function BlockRow({
  block,
  allComponents,
  onUpdate,
  onRemove,
  onDuplicate,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: BlockRowProps) {
  const [expanded, setExpanded] = useState(false)

  const componentMeta = allComponents.find((c) => c.name === block.component)
  const schema = componentMeta?.schema
  const displayName = componentMeta?.display_name || block.component
  const preview = getBlockPreview(block, schema)

  function handleFieldChange(key: string, value: any) {
    onUpdate({ ...block, [key]: value })
  }

  return (
    <div
      className={`group border rounded-lg overflow-hidden transition-all ${
        isDragging
          ? 'opacity-40 border-gray-300 dark:border-gray-600'
          : isDragOver
          ? 'border-teal-400 dark:border-teal-500 shadow-sm'
          : 'border-gray-200 dark:border-gray-700'
      }`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={(e) => { e.preventDefault(); onDrop() }}
    >
      {/* Block header */}
      <div
        className={`flex items-center gap-2 px-3 py-3 cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
          expanded ? 'bg-gray-50 dark:bg-gray-800/30 border-b border-gray-200 dark:border-gray-700' : ''
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        <GripVertical
          className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        />
        <input
          type="checkbox"
          className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        />
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{displayName}</div>
          {preview && (
            <div className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{preview}</div>
          )}
        </div>

        {/* Actions — visible on hover */}
        <div
          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            title="Duplicate"
            onClick={onDuplicate}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Cut"
            onClick={onRemove}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <Scissors className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Delete"
            onClick={onRemove}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Block fields — expanded */}
      {expanded && schema && (
        <div className="p-4 space-y-4 bg-white dark:bg-gray-900">
          <BlockFields
            schema={schema}
            data={block}
            allComponents={allComponents}
            onChange={handleFieldChange}
          />
        </div>
      )}

      {expanded && !schema && (
        <div className="p-3 text-sm text-gray-400 bg-white dark:bg-gray-900">
          Component schema not found for &quot;{block.component}&quot;
        </div>
      )}
    </div>
  )
}

function BlockFields({
  schema,
  data,
  allComponents,
  onChange,
}: {
  schema: Record<string, any>
  data: Record<string, any>
  allComponents: ComponentMeta[]
  onChange: (key: string, value: any) => void
}) {
  const fields = Object.entries(schema)
    .filter(([, def]) => def.type !== 'tab')
    .sort(([, a], [, b]) => (a.pos ?? 0) - (b.pos ?? 0))

  if (fields.length === 0) {
    return <p className="text-sm text-gray-400">No fields defined</p>
  }

  return (
    <>
      {fields.map(([key, def]) => (
        <FieldRenderer
          key={key}
          fieldKey={key}
          def={def}
          value={data[key]}
          onChange={(v) => onChange(key, v)}
          allComponents={allComponents}
        />
      ))}
    </>
  )
}

interface AddBlockMenuProps {
  allowedComponents: ComponentMeta[]
  onAdd: (componentName: string) => void
}

function AddBlockMenu({ allowedComponents, onAdd }: AddBlockMenuProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = allowedComponents.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.display_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 text-sm text-teal-600 dark:text-teal-400 border border-dashed border-teal-400 dark:border-teal-600 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors w-full justify-center"
      >
        <Plus className="w-4 h-4" />
        Add block
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-1 left-0 right-0 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <input
                type="text"
                placeholder="Search blocks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filtered.length === 0 && (
                <p className="px-3 py-2 text-sm text-gray-400">No blocks found</p>
              )}
              {filtered.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => { onAdd(c.name); setOpen(false); setSearch('') }}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <span className="font-medium">{c.display_name || c.name}</span>
                  {c.display_name && c.display_name !== c.name && (
                    <span className="ml-2 text-gray-400 text-xs">{c.name}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function BloksField({ fieldKey, def, value, onChange, allComponents }: Props) {
  const blocks = value ?? []
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  let allowedComponents = allComponents
  if (def.restrict_components && def.component_whitelist && def.component_whitelist.length > 0) {
    allowedComponents = allComponents.filter((c) => def.component_whitelist!.includes(c.name))
  }
  if (def.component_denylist && def.component_denylist.length > 0) {
    allowedComponents = allowedComponents.filter((c) => !def.component_denylist!.includes(c.name))
  }

  function addBlock(componentName: string) {
    const newBlock: BlockItem = { _uid: uuidv4(), component: componentName }
    const meta = allComponents.find((c) => c.name === componentName)
    if (meta?.schema) {
      Object.entries(meta.schema).forEach(([key, fieldDef]: [string, any]) => {
        if (fieldDef.default_value !== undefined) {
          newBlock[key] = fieldDef.default_value
        }
      })
    }
    onChange([...blocks, newBlock])
  }

  function updateBlock(index: number, updated: BlockItem) {
    const next = [...blocks]
    next[index] = updated
    onChange(next)
  }

  function removeBlock(index: number) {
    onChange(blocks.filter((_, i) => i !== index))
  }

  function duplicateBlock(index: number) {
    const original = blocks[index]
    const copy: BlockItem = { ...original, _uid: uuidv4() }
    const next = [...blocks]
    next.splice(index + 1, 0, copy)
    onChange(next)
  }

  function handleDrop(toIndex: number) {
    if (draggingIdx === null || draggingIdx === toIndex) {
      setDraggingIdx(null)
      setDragOverIdx(null)
      return
    }
    const next = [...blocks]
    const [item] = next.splice(draggingIdx, 1)
    next.splice(toIndex, 0, item)
    onChange(next)
    setDraggingIdx(null)
    setDragOverIdx(null)
  }

  const atMax = def.maximum !== undefined && blocks.length >= def.maximum

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {def.display_name || fieldKey}
          {def.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <span className="text-xs text-gray-400">
          {blocks.length}{def.maximum ? ` / ${def.maximum}` : ''} block{blocks.length !== 1 ? 's' : ''}
        </span>
      </div>
      {def.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{def.description}</p>
      )}

      <div className="space-y-1.5">
        {blocks.map((block, i) => (
          <BlockRow
            key={block._uid}
            block={block}
            allComponents={allComponents}
            onUpdate={(updated) => updateBlock(i, updated)}
            onRemove={() => removeBlock(i)}
            onDuplicate={() => duplicateBlock(i)}
            isDragging={draggingIdx === i}
            isDragOver={dragOverIdx === i && draggingIdx !== i}
            onDragStart={() => setDraggingIdx(i)}
            onDragEnd={() => { setDraggingIdx(null); setDragOverIdx(null) }}
            onDragOver={(e) => { e.preventDefault(); setDragOverIdx(i) }}
            onDrop={() => handleDrop(i)}
          />
        ))}

        {!atMax && (
          <AddBlockMenu allowedComponents={allowedComponents} onAdd={addBlock} />
        )}
      </div>
    </div>
  )
}
