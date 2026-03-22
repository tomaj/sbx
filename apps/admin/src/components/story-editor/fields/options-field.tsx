'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp, Search, GripVertical, X } from 'lucide-react'
import type { OptionsFieldDef } from '@/components/block-library/edit-block-modal/types'
import { fieldLabel } from '../field-label'
import { FieldLabel } from '../FieldLabel'

interface Props {
  fieldKey: string
  def: OptionsFieldDef
  value: string[] | undefined
  onChange: (v: string[]) => void
}

export function OptionsField({ fieldKey, def, value, onChange }: Props) {
  const options = def.options ?? []
  const selected = value ?? []
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [pending, setPending] = useState<string[]>(selected)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragIndex = useRef<number | null>(null)

  useEffect(() => { setPending(value ?? []) }, [value])

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const filtered = options.filter(o =>
    !search.trim() || o.name.toLowerCase().includes(search.toLowerCase())
  )

  function togglePending(val: string) {
    setPending(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    )
  }

  function handleAdd() {
    onChange(pending)
    setOpen(false)
    setSearch('')
  }

  function clearAll() {
    onChange([])
    setPending([])
  }

  function removeItem(val: string) {
    const next = selected.filter(v => v !== val)
    onChange(next)
    setPending(next)
  }

  function moveUp(i: number) {
    if (i === 0) return
    const next = [...selected]
    ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
    onChange(next)
  }

  function moveDown(i: number) {
    if (i === selected.length - 1) return
    const next = [...selected]
    ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
    onChange(next)
  }

  // Drag handlers
  function onDragStart(i: number) {
    dragIndex.current = i
  }

  function onDragOver(e: React.DragEvent, i: number) {
    e.preventDefault()
    const from = dragIndex.current
    if (from === null || from === i) return
    const next = [...selected]
    const [item] = next.splice(from, 1)
    next.splice(i, 0, item)
    dragIndex.current = i
    onChange(next)
  }

  function onDragEnd() {
    dragIndex.current = null
  }

  const selectedOptions = options.filter(o => selected.includes(o.value))
  // Preserve order from selected array
  const orderedSelected = selected
    .map(val => options.find(o => o.value === val))
    .filter(Boolean) as typeof options

  return (
    <div>
      <FieldLabel label={fieldLabel(def.display_name, fieldKey)} required={def.required} description={def.description} />
      <div ref={containerRef} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">

        {/* Selected items with drag & drop */}
        {orderedSelected.length > 0 && (
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{orderedSelected.length} item{orderedSelected.length !== 1 ? 's' : ''}</span>
              <button type="button" onClick={clearAll} className="text-teal-600 dark:text-teal-400 hover:underline">
                Clear selected
              </button>
            </div>
            {orderedSelected.map((opt, i) => (
              <div
                key={opt.value}
                draggable
                onDragStart={() => onDragStart(i)}
                onDragOver={e => onDragOver(e, i)}
                onDragEnd={onDragEnd}
                className="group flex items-center gap-2 px-3 py-2.5 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-grab active:cursor-grabbing select-none"
              >
                <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">{opt.name}</span>

                {/* Hover actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => removeItem(opt.value)}
                    title="Remove"
                    className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveUp(i)}
                    disabled={i === 0}
                    title="Move up"
                    className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-30"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(i)}
                    disabled={i === orderedSelected.length - 1}
                    title="Move down"
                    className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-30"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Closed trigger */}
        {!open ? (
          <button
            type="button"
            onClick={() => { setPending(selected); setOpen(true) }}
            className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <span>Choose one or more...</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        ) : (
          <div>
            {/* Search */}
            <div className="relative border-b border-gray-200 dark:border-gray-700 ring-2 ring-teal-500 ring-inset">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none"
              />
            </div>

            {/* Options list */}
            <div className="max-h-56 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-3 py-3 text-sm text-gray-400">No options found</p>
              ) : filtered.map(opt => (
                <label
                  key={opt._uid ?? opt.value}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={pending.includes(opt.value)}
                    onChange={() => togglePending(opt.value)}
                    className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{opt.name}</span>
                </label>
              ))}
            </div>

            {/* Add button */}
            <div className="border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleAdd}
                className="w-full py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
