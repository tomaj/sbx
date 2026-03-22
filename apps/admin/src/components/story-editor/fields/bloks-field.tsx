'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2, GripVertical, Copy, Scissors } from 'lucide-react'
import { parseSchema } from '@/components/block-library/edit-block-modal/types'
function uuidv4() { return crypto.randomUUID() }
import type { BloksFieldDef } from '@/components/block-library/edit-block-modal/types'
import type { ComponentMeta, ComponentGroup } from '../types'
import { FieldRenderer } from '../field-renderer'
import { InsertBlockPanel } from '../insert-block-panel'

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
  allGroups: ComponentGroup[]
  spaceId: string
}

function getBlockPreview(block: BlockItem, schema: Record<string, any> | undefined, previewField: string | null): string {
  if (!schema) return ''
  if (previewField && block[previewField] != null) {
    const val = block[previewField]
    if (typeof val === 'string') return val
    if (typeof val === 'number') return String(val)
  }
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

function renderPreviewTmpl(tmpl: string, data: Record<string, any>): string {
  return tmpl
    // {{@image(it.field.prop)/}} or {{@image(it.field)/}}
    .replace(/\{\{@image\(it\.(\w+)(?:\.(\w+))?\)\s*\/?\}\}/g, (_, key, prop) => {
      const obj = data[key]
      if (!obj) return ''
      const url = prop
        ? (obj && typeof obj === 'object' ? obj[prop] : null)
        : (typeof obj === 'string' ? obj : obj?.filename)
      if (!url || typeof url !== 'string') return ''
      return `<img src="${url}" style="max-width:120px;max-height:80px;object-fit:cover;border-radius:4px;margin-top:4px;" />`
    })
    // {{it.field.length}}
    .replace(/\{\{\s*it\.(\w+)\.length\s*\}\}/g, (_, key) => {
      const val = data[key]
      return Array.isArray(val) ? String(val.length) : '0'
    })
    // {{it.field.prop}}
    .replace(/\{\{\s*it\.(\w+)\.(\w+)\s*\}\}/g, (_, key, prop) => {
      const obj = data[key]
      if (obj && typeof obj === 'object' && obj[prop] != null) return String(obj[prop])
      return ''
    })
    // {{it.field}}
    .replace(/\{\{\s*it\.(\w+)\s*\}\}/g, (_, key) => {
      const val = data[key]
      if (val === undefined || val === null) return ''
      if (typeof val === 'string') return val
      return String(val)
    })
}

// ── BlockFields with tabs support ────────────────────────────────────────────

function BlockFields({
  schema,
  data,
  allComponents,
  allGroups,
  spaceId,
  onChange,
}: {
  schema: Record<string, any>
  data: Record<string, any>
  allComponents: ComponentMeta[]
  allGroups: ComponentGroup[]
  spaceId: string
  onChange: (key: string, value: any) => void
}) {
  const [activeTab, setActiveTab] = useState(0)
  const { tabs, fields } = parseSchema(schema)
  const visibleTabs = tabs.filter((t) => fields.some((f) => f.tabKey === t.key))
  const hasTabs = visibleTabs.length > 1

  const currentTab = hasTabs ? (visibleTabs[activeTab] ?? visibleTabs[0]) : visibleTabs[0]
  const visibleFields = hasTabs
    ? fields.filter((f) => f.tabKey === currentTab?.key)
    : fields

  if (visibleFields.length === 0 && !hasTabs) {
    return <p className="text-sm text-gray-400">No fields defined</p>
  }

  return (
    <div>
      {hasTabs && (
        <div className="flex border-b border-gray-200 dark:border-gray-700 -mx-4 px-4 mb-4">
          {visibleTabs.map((tab, i) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(i)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
                i === activeTab
                  ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      )}
      <div className="space-y-4">
        {visibleFields.map((field) => (
          <FieldRenderer
            key={field.key}
            fieldKey={field.key}
            def={field.def}
            value={data[field.key]}
            onChange={(v) => onChange(field.key, v)}
            allComponents={allComponents}
            allGroups={allGroups}
            spaceId={spaceId}
          />
        ))}
      </div>
    </div>
  )
}

// ── BlockRow ──────────────────────────────────────────────────────────────────

interface BlockRowProps {
  block: BlockItem
  allComponents: ComponentMeta[]
  allGroups: ComponentGroup[]
  spaceId: string
  isLast: boolean
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
  allGroups,
  spaceId,
  isLast,
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
  const previewTmpl = componentMeta?.preview_tmpl
  const preview = previewTmpl ? null : getBlockPreview(block, schema, componentMeta?.preview_field ?? null)

  function handleFieldChange(key: string, value: any) {
    onUpdate({ ...block, [key]: value })
  }

  return (
    <div
      className={`group transition-all ${isDragging ? 'opacity-40' : ''} ${
        isDragOver ? 'ring-2 ring-teal-400 ring-inset' : ''
      }`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={(e) => { e.preventDefault(); onDrop() }}
    >
      {/* Block header */}
      <div
        className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${
          expanded ? 'bg-gray-50 dark:bg-gray-800/30' : ''
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Grip — hover only */}
        <GripVertical
          className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        />

        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{displayName}</div>
          {previewTmpl ? (
            <div
              className="text-xs text-gray-400 dark:text-gray-500 mt-0.5"
              dangerouslySetInnerHTML={{ __html: renderPreviewTmpl(previewTmpl, block) }}
            />
          ) : preview ? (
            <div className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{preview}</div>
          ) : null}
        </div>

        {/* Actions — hover only */}
        <div
          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" title="Duplicate" onClick={onDuplicate}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button type="button" title="Cut" onClick={onRemove}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
            <Scissors className="w-3.5 h-3.5" />
          </button>
          <button type="button" title="Delete" onClick={onRemove}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded fields */}
      {expanded && schema && (
        <div className="px-4 py-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
          <BlockFields
            schema={schema}
            data={block}
            allComponents={allComponents}
            allGroups={allGroups}
            spaceId={spaceId}
            onChange={handleFieldChange}
          />
        </div>
      )}
      {expanded && !schema && (
        <div className="px-4 py-3 text-sm text-gray-400 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
          Component schema not found for &quot;{block.component}&quot;
        </div>
      )}

      {/* Divider — except after last item */}
      {!isLast && (
        <div className="border-b border-gray-100 dark:border-gray-800 mx-0" />
      )}
    </div>
  )
}

// ── BloksField ────────────────────────────────────────────────────────────────

export function BloksField({ fieldKey, def, value, onChange, allComponents, allGroups, spaceId }: Props) {
  const blocks = value ?? []
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

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
        if (fieldDef.default_value !== undefined) newBlock[key] = fieldDef.default_value
      })
    }
    onChange([...blocks, newBlock])
  }

  function updateBlock(index: number, updated: BlockItem) {
    const next = [...blocks]; next[index] = updated; onChange(next)
  }

  function removeBlock(index: number) {
    onChange(blocks.filter((_, i) => i !== index))
  }

  function duplicateBlock(index: number) {
    const copy: BlockItem = { ...blocks[index], _uid: uuidv4() }
    const next = [...blocks]; next.splice(index + 1, 0, copy); onChange(next)
  }

  function handleDrop(toIndex: number) {
    if (draggingIdx === null || draggingIdx === toIndex) {
      setDraggingIdx(null); setDragOverIdx(null); return
    }
    const next = [...blocks]
    const [item] = next.splice(draggingIdx, 1)
    next.splice(toIndex, 0, item)
    onChange(next)
    setDraggingIdx(null); setDragOverIdx(null)
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

      {blocks.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {blocks.map((block, i) => (
            <BlockRow
              key={block._uid}
              block={block}
              allComponents={allComponents}
              allGroups={allGroups}
              spaceId={spaceId}
              isLast={i === blocks.length - 1}
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
        </div>
      )}

      {!atMax && (
        <>
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-teal-600 dark:text-teal-400 border border-dashed border-teal-400 dark:border-teal-600 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors w-full justify-center mt-2"
          >
            <Plus className="w-4 h-4" />
            Add block
          </button>
          <InsertBlockPanel
            open={panelOpen}
            allowedComponents={allowedComponents}
            allGroups={allGroups}
            onAdd={addBlock}
            onClose={() => setPanelOpen(false)}
          />
        </>
      )}
    </div>
  )
}
