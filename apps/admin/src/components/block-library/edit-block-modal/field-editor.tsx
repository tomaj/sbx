'use client'

import { useState, useRef, useEffect } from 'react'
import { Pencil, GripVertical, Trash2, Plus, ChevronDown, Lock, Unlock } from 'lucide-react'
import { FieldIcon } from './field-icon'
import {
  type AnyFieldDef,
  type FieldType,
  type FieldConditions,
  type FieldConditionRule,
  type WorkingField,
  type OptionFieldDef,
  type OptionsFieldDef,
  type BloksFieldDef,
  ADDABLE_FIELD_TYPES,
  FIELD_TYPE_LABELS,
} from './types'
import type { ComponentGroup } from '../group-tree'

// ─── Shared form helpers ──────────────────────────────────────────────────────

function FormRow({ children }: { children: React.ReactNode }) {
  return <div className="mb-4">{children}</div>
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
      {children}
    </label>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold text-teal-600 dark:text-teal-400 mb-3 mt-5 pb-2 border-b border-gray-100 dark:border-gray-800">
      {children}
    </p>
  )
}

// ─── Reusable SelectDropdown ──────────────────────────────────────────────────

interface SelectOption {
  value: string
  label: string
}

export function SelectDropdown({
  value,
  onChange,
  options,
  placeholder = 'Choose...',
  loading = false,
  className,
}: {
  value: string | null | undefined
  onChange: (v: string | null) => void
  options: SelectOption[]
  placeholder?: string
  loading?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const selected = options.find((o) => o.value === (value ?? ''))
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setFilter('') }}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-900 transition-colors min-h-[40px] ${
          open
            ? 'border-teal-500 ring-2 ring-teal-200 dark:ring-teal-900'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
      >
        <span className={selected ? 'text-gray-900 dark:text-gray-100' : 'text-teal-500 dark:text-teal-400'}>
          {loading ? 'Loading...' : (selected?.label ?? placeholder)}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
            {options.length > 6 && (
              <div className="sticky top-0 bg-white dark:bg-gray-900 px-3 pt-2 pb-1 border-b border-gray-100 dark:border-gray-800">
                <input
                  autoFocus
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter..."
                  className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            {placeholder && (
              <button
                type="button"
                onClick={() => { onChange(null); setOpen(false) }}
                className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                  !value ? 'text-teal-600 dark:text-teal-400 font-medium bg-gray-50 dark:bg-gray-800' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {placeholder}
              </button>
            )}
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-sm text-gray-400">No results</div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false) }}
                  className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                    value === o.value
                      ? 'bg-gray-50 dark:bg-gray-800 font-medium text-teal-600 dark:text-teal-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

function TooltipHint({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <div
      className="relative inline-flex flex-shrink-0"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <div className="w-4 h-4 rounded-full border border-gray-400 text-gray-400 text-[10px] flex items-center justify-center cursor-help select-none">
        ?
      </div>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-950 text-white text-xs rounded-lg shadow-xl z-50 pointer-events-none leading-relaxed">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-950" />
        </div>
      )}
    </div>
  )
}

function CheckboxRow({
  label,
  checked,
  onChange,
  tooltip,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  tooltip?: string
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer mb-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
      />
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      {tooltip && <TooltipHint text={tooltip} />}
    </label>
  )
}

function NumberStepper({
  value,
  onChange,
  min,
}: {
  value: number | undefined
  onChange: (v: number | undefined) => void
  min?: number
}) {
  const minVal = min ?? 0
  return (
    <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden w-44">
      <button
        type="button"
        onClick={() => {
          const v = (value ?? 0) - 1
          onChange(v < minVal ? undefined : v)
        }}
        className="px-3 py-2 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 border-r border-gray-200 dark:border-gray-700 text-sm font-medium flex-shrink-0"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={value ?? ''}
        onChange={(e) => {
          const raw = e.target.value
          if (raw === '') { onChange(undefined); return }
          const n = parseInt(raw, 10)
          if (!isNaN(n)) onChange(n < minVal ? minVal : n)
        }}
        className="flex-1 text-center text-sm text-gray-700 dark:text-gray-300 py-2 bg-transparent focus:outline-none min-w-0"
      />
      <button
        type="button"
        onClick={() => onChange((value ?? 0) + 1)}
        className="px-3 py-2 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 border-l border-gray-200 dark:border-gray-700 text-sm font-medium flex-shrink-0"
      >
        +
      </button>
    </div>
  )
}

// ─── Option list editor (for single-option / multi-options) ──────────────────

type SimpleOption = { name: string; value: string; _uid?: string }

function OptionsList({
  options,
  onChange,
}: {
  options: SimpleOption[]
  onChange: (opts: SimpleOption[]) => void
}) {
  const dragIdx = useRef<number | null>(null)
  const dragOverIdx = useRef<number | null>(null)

  function update(idx: number, field: 'name' | 'value', val: string) {
    const next = options.map((o, i) => (i === idx ? { ...o, [field]: val } : o))
    onChange(next)
  }

  function remove(idx: number) {
    onChange(options.filter((_, i) => i !== idx))
  }

  function add() {
    onChange([...options, { name: '', value: '', _uid: `uid_${Date.now()}` }])
  }

  function handleDrop() {
    const from = dragIdx.current
    const to = dragOverIdx.current
    if (from === null || to === null || from === to) return
    const next = [...options]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
    dragIdx.current = null
    dragOverIdx.current = null
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs font-medium text-gray-500 w-5" />
        <span className="flex-1 text-xs font-medium text-gray-500 dark:text-gray-400">Name</span>
        <span className="flex-1 text-xs font-medium text-gray-500 dark:text-gray-400">Value</span>
        <span className="w-7" />
      </div>

      {options.map((opt, idx) => (
        <div
          key={opt._uid ?? idx}
          draggable
          onDragStart={() => { dragIdx.current = idx }}
          onDragOver={(e) => { e.preventDefault(); dragOverIdx.current = idx }}
          onDrop={handleDrop}
          className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-100 dark:border-gray-800/60 last:border-0"
        >
          <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0 cursor-grab" />
          <input
            type="text"
            value={opt.name}
            placeholder="Name"
            onChange={(e) => update(idx, 'name', e.target.value)}
            className="flex-1 px-2 py-1 text-sm border border-transparent hover:border-gray-200 focus:border-teal-400 focus:outline-none rounded bg-transparent focus:bg-white dark:focus:bg-gray-900 dark:text-gray-200"
          />
          <input
            type="text"
            value={opt.value}
            placeholder="Value"
            onChange={(e) => update(idx, 'value', e.target.value)}
            className="flex-1 px-2 py-1 text-sm border border-transparent hover:border-gray-200 focus:border-teal-400 focus:outline-none rounded bg-transparent focus:bg-white dark:focus:bg-gray-900 dark:text-gray-200"
          />
          <button
            type="button"
            onClick={() => remove(idx)}
            className="p-1 text-gray-300 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      <div className="px-2 py-1.5">
        <button
          type="button"
          onClick={add}
          className="text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> New option
        </button>
      </div>
    </div>
  )
}

// ─── Type-specific options ────────────────────────────────────────────────────

function TextOptions({ def, onChange }: { def: any; onChange: (patch: any) => void }) {
  return (
    <>
      <SectionTitle>Text Field Options</SectionTitle>
      <CheckboxRow label="Enable RTL" checked={!!def.rtl} onChange={(v) => onChange({ rtl: v })} tooltip="Writing starts from the right of the page and continues to the left." />
      <FormRow>
        <Label>Default value</Label>
        <textarea
          value={def.default_value ?? ''}
          onChange={(e) => onChange({ default_value: e.target.value || undefined })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
      </FormRow>
      <FormRow>
        <Label>Maximum characters</Label>
        <NumberStepper value={def.max_length} onChange={(v) => onChange({ max_length: v })} min={0} />
      </FormRow>
      <FormRow>
        <Label>Regex validation</Label>
        <textarea
          value={def.regex ?? ''}
          onChange={(e) => onChange({ regex: e.target.value || undefined })}
          rows={2}
          placeholder="^[a-z]+$"
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
        <p className="mt-1 text-xs text-gray-400">Validates the field value against this regular expression</p>
      </FormRow>
    </>
  )
}

function TextareaOptions({ def, onChange }: { def: any; onChange: (patch: any) => void }) {
  return (
    <>
      <SectionTitle>Textarea Field Options</SectionTitle>
      <CheckboxRow label="Enable RTL" checked={!!def.rtl} onChange={(v) => onChange({ rtl: v })} tooltip="Writing starts from the right of the page and continues to the left." />
      <FormRow>
        <Label>Maximum characters</Label>
        <NumberStepper value={def.max_length} onChange={(v) => onChange({ max_length: v })} min={0} />
      </FormRow>
      <FormRow>
        <Label>Default value</Label>
        <textarea
          value={def.default_value ?? ''}
          onChange={(e) => onChange({ default_value: e.target.value || undefined })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
      </FormRow>
      <FormRow>
        <Label>Regex validation</Label>
        <textarea
          value={def.regex ?? ''}
          onChange={(e) => onChange({ regex: e.target.value || undefined })}
          rows={2}
          placeholder="^[a-z]+$"
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
        <p className="mt-1 text-xs text-gray-400">Validates the field value against this regular expression</p>
      </FormRow>
    </>
  )
}

function RichtextOptions({ def, onChange }: { def: any; onChange: (patch: any) => void }) {
  return (
    <>
      <SectionTitle>Richtext Field Options</SectionTitle>
      <FormRow>
        <Label>Maximum characters</Label>
        <NumberStepper value={def.max_length} onChange={(v) => onChange({ max_length: v })} min={0} />
      </FormRow>
      <FormRow>
        <Label>Default value</Label>
        <textarea
          value={def.default_value ?? ''}
          onChange={(e) => onChange({ default_value: e.target.value || undefined })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
      </FormRow>
      <FormRow>
        <Label>Custom CSS class</Label>
        <input
          type="text"
          value={def.custom_class ?? ''}
          onChange={(e) => onChange({ custom_class: e.target.value || undefined })}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </FormRow>
    </>
  )
}

function MarkdownOptions({ def, onChange }: { def: any; onChange: (patch: any) => void }) {
  return (
    <>
      <SectionTitle>Markdown Field Options</SectionTitle>
      <CheckboxRow label="Enable RTL" checked={!!def.rtl} onChange={(v) => onChange({ rtl: v })} tooltip="Writing starts from the right of the page and continues to the left." />
      <CheckboxRow label="Rich-text as default" checked={!!def.rich_text_as_default} onChange={(v) => onChange({ rich_text_as_default: v })} tooltip="When enabled, the editor opens in rich-text mode by default instead of markdown mode." />
      <CheckboxRow label="Allow empty paragraphs" checked={!!def.allow_empty_paragraphs} onChange={(v) => onChange({ allow_empty_paragraphs: v })} tooltip="Allows the field to contain paragraphs with no content." />
      <CheckboxRow label="Customize toolbar items" checked={!!def.customize_toolbar} onChange={(v) => onChange({ customize_toolbar: v })} tooltip="Select which toolbar buttons are available in the editor." />
      <FormRow>
        <Label>Maximum characters</Label>
        <NumberStepper value={def.max_length} onChange={(v) => onChange({ max_length: v })} min={0} />
      </FormRow>
      <FormRow>
        <Label>Default value</Label>
        <textarea
          value={def.default_value ?? ''}
          onChange={(e) => onChange({ default_value: e.target.value || undefined })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
      </FormRow>
    </>
  )
}

function NumberOptions({ def, onChange }: { def: any; onChange: (patch: any) => void }) {
  return (
    <>
      <SectionTitle>Number Field Options</SectionTitle>
      <FormRow>
        <Label>Default value</Label>
        <input
          type="text"
          value={def.default_value ?? ''}
          onChange={(e) => onChange({ default_value: e.target.value || undefined })}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </FormRow>
      <FormRow>
        <Label>Min value</Label>
        <NumberStepper value={def.min_value} onChange={(v) => onChange({ min_value: v })} />
      </FormRow>
      <FormRow>
        <Label>Max value</Label>
        <NumberStepper value={def.max_value} onChange={(v) => onChange({ max_value: v })} />
      </FormRow>
      <FormRow>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Number of decimals</span>
          <TooltipHint text="The number of decimal places is the number of digits that appear after the decimal point." />
        </div>
        <NumberStepper value={def.decimals} onChange={(v) => onChange({ decimals: v })} min={0} />
        <p className="mt-1 text-xs text-gray-400">{def.decimals ?? 0}</p>
      </FormRow>
      <FormRow>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Step size</span>
          <TooltipHint text="Specifies the interval between numbers in the input field." />
        </div>
        <NumberStepper value={def.steps} onChange={(v) => onChange({ steps: v })} min={0} />
        <p className="mt-1 text-xs text-gray-400">{def.steps != null ? def.steps : '1, 2, 3, ...'}</p>
      </FormRow>
    </>
  )
}

function DatetimeOptions({ def, onChange }: { def: any; onChange: (patch: any) => void }) {
  return (
    <>
      <SectionTitle>Date/Time Field Options</SectionTitle>
      <CheckboxRow label="Disable time selection" checked={!!def.disable_time} onChange={(v) => onChange({ disable_time: v })} />
      <FormRow>
        <Label>Default value</Label>
        <input
          type="text"
          value={def.default_value ?? ''}
          onChange={(e) => onChange({ default_value: e.target.value || undefined })}
          placeholder="YYYY-MM-DD HH:mm"
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </FormRow>
    </>
  )
}

function BooleanOptions({ def, onChange }: { def: any; onChange: (patch: any) => void }) {
  return (
    <>
      <SectionTitle>Boolean Field Options</SectionTitle>
      <CheckboxRow label="Inline label" checked={!!def.inline_label} onChange={(v) => onChange({ inline_label: v })} />
      <FormRow>
        <Label>Default value</Label>
        <button
          type="button"
          onClick={() => onChange({ default_value: !def.default_value })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            def.default_value ? 'bg-teal-600' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              def.default_value ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </FormRow>
    </>
  )
}

const SOURCE_OPTIONS = [
  { value: 'self', label: 'Self' },
  { value: 'internal_stories', label: 'Stories' },
  { value: 'internal', label: 'Datasource' },
  { value: 'external_datasource', label: 'External JSON' },
  { value: 'internal_languages', label: 'Internal languages' },
]

function SourceSubCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 mb-4 space-y-3">
      {children}
    </div>
  )
}

function OptionSourceConfig({
  def,
  onChange,
  spaceId,
}: {
  def: OptionFieldDef | OptionsFieldDef
  onChange: (patch: any) => void
  spaceId?: string
}) {
  const source = def.source ?? 'self'
  const [datasources, setDatasources] = useState<Array<{ slug: string; name: string }>>([])
  const [components, setComponents] = useState<Array<{ name: string }>>([])
  const [loadingDS, setLoadingDS] = useState(false)
  const [loadingCT, setLoadingCT] = useState(false)

  useEffect(() => {
    if (source !== 'internal' || !spaceId) return
    setLoadingDS(true)
    fetch(`/api/admin/spaces/${spaceId}/datasources`)
      .then((r) => r.json())
      .then((data) => setDatasources(data.datasources ?? []))
      .finally(() => setLoadingDS(false))
  }, [source, spaceId])

  useEffect(() => {
    if (source !== 'internal_stories' || !spaceId) return
    setLoadingCT(true)
    fetch(`/api/admin/spaces/${spaceId}/components?per_page=500`)
      .then((r) => r.json())
      .then((data) => setComponents(data.components ?? []))
      .finally(() => setLoadingCT(false))
  }, [source, spaceId])

  const selectedCT: string[] = def.filter_content_type ?? []
  const ctItems = components.map((c) => ({ id: c.name, label: c.name }))

  if (source === 'self') {
    return (
      <SourceSubCard>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Add options</p>
        <OptionsList
          options={def.options ?? []}
          onChange={(opts) => onChange({ options: opts })}
        />
        <CheckboxRow
          label="Hide empty option"
          checked={!!def.exclude_empty_option}
          onChange={(v) => onChange({ exclude_empty_option: v })}
        />
      </SourceSubCard>
    )
  }

  if (source === 'internal') {
    return (
      <SourceSubCard>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Internal datasource</p>
        <SelectDropdown
          value={def.datasource_slug ?? null}
          onChange={(v) => onChange({ datasource_slug: v ?? undefined })}
          options={datasources.map((ds) => ({ value: ds.slug, label: ds.name }))}
          placeholder="Choose an option"
          loading={loadingDS}
        />
      </SourceSubCard>
    )
  }

  if (source === 'internal_stories') {
    return (
      <SourceSubCard>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Path to folder of stories</p>
            <TooltipHint text="Restrict which stories can be selected by specifying a folder path. Example: categories/" />
          </div>
          <input
            type="text"
            value={def.link_scope ?? ''}
            onChange={(e) => onChange({ link_scope: e.target.value || undefined })}
            placeholder="Example: categories/"
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Restrict to content type</p>
          <MultiSelectPicker
            placeholder="Choose..."
            selectedIds={selectedCT}
            items={ctItems}
            loading={loadingCT}
            onToggle={(id) => onChange({ filter_content_type: selectedCT.includes(id) ? selectedCT.filter((x) => x !== id) : [...selectedCT, id] })}
            onClearAll={() => onChange({ filter_content_type: [] })}
          />
        </div>
        <CheckboxRow
          label="Enable advanced search"
          checked={!!def.allow_advanced_search}
          onChange={(v) => onChange({ allow_advanced_search: v || undefined })}
          tooltip="Allows searching stories by multiple fields in the editor."
        />
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Appearance</p>
            <TooltipHint text="Controls how stories are displayed in the selection dropdown." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {([
              { value: 'link', label: 'Entry link', icon: (
                <svg viewBox="0 0 80 48" className="w-full h-8 mb-1" fill="none">
                  <rect x="4" y="8" width="72" height="32" rx="4" fill="#e5e7eb" />
                  <rect x="10" y="16" width="40" height="4" rx="2" fill="#9ca3af" />
                  <rect x="10" y="24" width="28" height="3" rx="1.5" fill="#d1d5db" />
                </svg>
              )},
              { value: 'card', label: 'Entry card', icon: (
                <svg viewBox="0 0 80 48" className="w-full h-8 mb-1" fill="none">
                  <rect x="4" y="4" width="72" height="40" rx="4" fill="#e5e7eb" />
                  <rect x="10" y="10" width="35" height="4" rx="2" fill="#9ca3af" />
                  <rect x="10" y="18" width="25" height="3" rx="1.5" fill="#d1d5db" />
                  <rect x="50" y="10" width="18" height="22" rx="2" fill="#d1d5db" />
                </svg>
              )},
            ] as const).map(({ value, label, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ appearance: value })}
                className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${
                  (def.appearance ?? 'link') === value
                    ? 'border-teal-500 bg-white dark:bg-gray-900'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300'
                }`}
              >
                {icon}
                <span className={`text-sm font-medium ${(def.appearance ?? 'link') === value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </SourceSubCard>
    )
  }

  if (source === 'external_datasource') {
    return (
      <SourceSubCard>
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">URL</p>
          <input
            type="text"
            value={def.external_datasource ?? ''}
            onChange={(e) => onChange({ external_datasource: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <CheckboxRow
          label="Hide empty option"
          checked={!!def.exclude_empty_option}
          onChange={(v) => onChange({ exclude_empty_option: v })}
        />
      </SourceSubCard>
    )
  }

  return null
}

function SourceSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <FormRow>
      <Label>Source</Label>
      <SelectDropdown
        value={value}
        onChange={(v) => onChange(v ?? 'self')}
        options={SOURCE_OPTIONS}
        placeholder=""
      />
    </FormRow>
  )
}

function SingleOptionOptions({
  def,
  onChange,
  spaceId,
}: {
  def: OptionFieldDef
  onChange: (patch: any) => void
  spaceId?: string
}) {
  return (
    <>
      <SectionTitle>Single-Option Field Options</SectionTitle>
      <SourceSelect value={def.source ?? 'self'} onChange={(v) => onChange({ source: v })} />
      <OptionSourceConfig def={def} onChange={onChange} spaceId={spaceId} />
      <FormRow>
        <Label>Default value</Label>
        <input
          type="text"
          value={String(def.default_value ?? '')}
          onChange={(e) => onChange({ default_value: e.target.value || undefined })}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </FormRow>
    </>
  )
}

function MultiOptionsOptions({
  def,
  onChange,
  spaceId,
}: {
  def: OptionsFieldDef
  onChange: (patch: any) => void
  spaceId?: string
}) {
  return (
    <>
      <SectionTitle>Multi-Options Field Options</SectionTitle>
      <SourceSelect value={def.source ?? 'self'} onChange={(v) => onChange({ source: v })} />
      <OptionSourceConfig def={def} onChange={onChange} spaceId={spaceId} />
      <FormRow>
        <Label>Minimum selections</Label>
        <NumberStepper value={def.min} onChange={(v) => onChange({ min: v })} min={0} />
      </FormRow>
      <FormRow>
        <Label>Maximum selections</Label>
        <NumberStepper value={def.max} onChange={(v) => onChange({ max: v })} min={0} />
      </FormRow>
    </>
  )
}

function ReferencesOptions({
  def,
  onChange,
  spaceId,
}: {
  def: any
  onChange: (patch: any) => void
  spaceId?: string
}) {
  const [components, setComponents] = useState<Array<{ name: string }>>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!spaceId) return
    setLoading(true)
    fetch(`/api/admin/spaces/${spaceId}/components?per_page=500`)
      .then((r) => r.json())
      .then((data) => setComponents(data.components ?? []))
      .finally(() => setLoading(false))
  }, [spaceId])

  const componentItems = components.map((c) => ({ id: c.name, label: c.name }))
  const selected: string[] = def.component_whitelist ?? []

  return (
    <>
      <SectionTitle>References Field Options</SectionTitle>
      <CheckboxRow
        label="Enable advanced search"
        checked={def.enable_advanced_search !== false}
        onChange={(v) => onChange({ enable_advanced_search: v })}
        tooltip="Allows searching stories by multiple fields"
      />
      <CheckboxRow
        label="Restrict to content types"
        checked={!!def.restrict_content_types}
        onChange={(v) => onChange({ restrict_content_types: v || undefined })}
      />
      {def.restrict_content_types && (
        <FormRow>
          <Label>Content type whitelist</Label>
          <MultiSelectPicker
            placeholder="Choose..."
            selectedIds={selected}
            items={componentItems}
            loading={loading}
            onToggle={(id) => onChange({ component_whitelist: selected.includes(id) ? selected.filter((x: string) => x !== id) : [...selected, id] })}
            onClearAll={() => onChange({ component_whitelist: [] })}
          />
        </FormRow>
      )}
      <CheckboxRow
        label="Force folder restriction"
        checked={!!def.force_link_scope}
        onChange={(v) => onChange({ force_link_scope: v || undefined })}
      />
      <FormRow>
        <Label>Restrict to folder</Label>
        <input
          type="text"
          value={def.link_scope ?? ''}
          onChange={(e) => onChange({ link_scope: e.target.value || undefined })}
          placeholder="Example: categories/"
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <p className="mt-1 text-xs text-gray-400">
          With {'{0}'} the path will be replaced dynamically using parts of the current slug.
          Examples: {'{0}'}/categories/, {'{0}'}/{'{1}'}/categories/
        </p>
      </FormRow>
    </>
  )
}

const FILETYPES = [
  { value: 'images', label: 'Images' },
  { value: 'videos', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
  { value: 'text_documents', label: 'Text-Documents' },
]

function AssetOptions({
  def,
  onChange,
  spaceId,
}: {
  def: any
  onChange: (patch: any) => void
  spaceId?: string
}) {
  const filetypes: string[] = def.filetypes ?? []
  const isAny = filetypes.length === 0
  const [folders, setFolders] = useState<Array<{ id: number; name: string }>>([])
  const [loadingFolders, setLoadingFolders] = useState(false)

  useEffect(() => {
    if (!spaceId) return
    setLoadingFolders(true)
    fetch(`/api/admin/spaces/${spaceId}/assets/folders`)
      .then((r) => r.json())
      .then((data) => setFolders(data.asset_folders ?? data.folders ?? []))
      .finally(() => setLoadingFolders(false))
  }, [spaceId])

  function toggleFiletype(value: string) {
    if (filetypes.includes(value)) {
      onChange({ filetypes: filetypes.filter((f: string) => f !== value) })
    } else {
      onChange({ filetypes: [...filetypes, value] })
    }
  }

  return (
    <>
      <SectionTitle>Asset Field Options</SectionTitle>
      <CheckboxRow label="Allow external URL" checked={!!def.allow_external_url} onChange={(v) => onChange({ allow_external_url: v })} />
      <FormRow>
        <Label>Filetypes</Label>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <label className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${isAny ? 'bg-gray-50 dark:bg-gray-800' : ''}`}>
            <input
              type="checkbox"
              checked={isAny}
              onChange={() => onChange({ filetypes: [] })}
              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Any filetype</span>
          </label>
          {FILETYPES.map((ft) => (
            <label key={ft.value} className="flex items-center gap-2 px-3 py-2 cursor-pointer border-t border-gray-100 dark:border-gray-800">
              <input
                type="checkbox"
                checked={filetypes.includes(ft.value)}
                onChange={() => toggleFiletype(ft.value)}
                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{ft.label}</span>
            </label>
          ))}
        </div>
      </FormRow>
      <FormRow>
        <Label>Default assets folder</Label>
        <SelectDropdown
          value={def.asset_folder_id != null ? String(def.asset_folder_id) : null}
          onChange={(v) => onChange({ asset_folder_id: v != null ? Number(v) : null })}
          options={folders.map((f) => ({ value: String(f.id), label: f.name }))}
          placeholder="Choose..."
          loading={loadingFolders}
        />
      </FormRow>
    </>
  )
}

function LinkOptions({
  def,
  onChange,
  spaceId,
}: {
  def: any
  onChange: (patch: any) => void
  spaceId?: string
}) {
  const [components, setComponents] = useState<Array<{ name: string }>>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!spaceId) return
    setLoading(true)
    fetch(`/api/admin/spaces/${spaceId}/components?per_page=500`)
      .then((r) => r.json())
      .then((data) => setComponents(data.components ?? []))
      .finally(() => setLoading(false))
  }, [spaceId])

  const componentItems = components.map((c) => ({ id: c.name, label: c.name }))
  const selected: string[] = def.component_whitelist ?? []

  return (
    <>
      <SectionTitle>Link Field Options</SectionTitle>
      <CheckboxRow label="Enable email field" checked={!!def.email_link_type} onChange={(v) => onChange({ email_link_type: v })} />
      <CheckboxRow label="Enable asset selection" checked={!!def.asset_link_type} onChange={(v) => onChange({ asset_link_type: v })} />
      <CheckboxRow label="Enable anchor field on internal link" checked={!!def.show_anchor} onChange={(v) => onChange({ show_anchor: v })} />
      <CheckboxRow label="Allow links to be open in a new tab" checked={!!def.allow_target_blank} onChange={(v) => onChange({ allow_target_blank: v })} />
      <CheckboxRow label="Enable custom attributes" checked={!!def.allow_custom_attributes} onChange={(v) => onChange({ allow_custom_attributes: v })} />
      <CheckboxRow
        label="Restrict to content types"
        checked={!!def.restrict_content_types}
        onChange={(v) => onChange({ restrict_content_types: v || undefined })}
      />
      {def.restrict_content_types && (
        <FormRow>
          <Label>Content type whitelist</Label>
          <MultiSelectPicker
            placeholder="Choose..."
            selectedIds={selected}
            items={componentItems}
            loading={loading}
            onToggle={(id) => onChange({ component_whitelist: selected.includes(id) ? selected.filter((x: string) => x !== id) : [...selected, id] })}
            onClearAll={() => onChange({ component_whitelist: [] })}
          />
        </FormRow>
      )}
      <CheckboxRow
        label="Force folder restriction"
        checked={!!def.force_link_scope}
        onChange={(v) => onChange({ force_link_scope: v || undefined })}
      />
      <FormRow>
        <Label>Restrict to folder</Label>
        <input
          type="text"
          value={def.link_scope ?? ''}
          onChange={(e) => onChange({ link_scope: e.target.value || undefined })}
          placeholder="Example: categories/"
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <p className="mt-1 text-xs text-gray-400">
          With {'{0}'} the path will be replaced dynamically using parts of the current slug.
          Examples: {'{0}'}/categories/, {'{0}'}/{'{1}'}/categories/
        </p>
      </FormRow>
    </>
  )
}

function GroupOptions({
  def,
  allFields,
  currentKey,
  onChange,
}: {
  def: any
  allFields: WorkingField[]
  currentKey: string
  onChange: (patch: any) => void
}) {
  const selectedKeys: string[] = def.keys ?? []
  const availableFields = allFields.filter((f) => f.key !== currentKey && f.def.type !== 'tab')

  function toggle(key: string) {
    if (selectedKeys.includes(key)) {
      onChange({ keys: selectedKeys.filter((k) => k !== key) })
    } else {
      onChange({ keys: [...selectedKeys, key] })
    }
  }

  return (
    <>
      <SectionTitle>Group contains these fields</SectionTitle>
      {availableFields.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No other fields available</p>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {availableFields.map((f) => (
            <label
              key={f.key}
              className="flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <input
                type="checkbox"
                checked={selectedKeys.includes(f.key)}
                onChange={() => toggle(f.key)}
                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{f.key}</span>
              {f.def.display_name && (
                <span className="text-xs text-gray-400">({f.def.display_name})</span>
              )}
            </label>
          ))}
        </div>
      )}
    </>
  )
}

// ─── Field Conditions ─────────────────────────────────────────────────────────

const VALIDATION_OPTIONS: Array<{ value: FieldConditionRule['validation']; label: string; hasValue: boolean }> = [
  { value: 'empty', label: 'Is empty', hasValue: false },
  { value: 'not_empty', label: 'Is not empty', hasValue: false },
  { value: 'equal', label: 'Is equal to', hasValue: true },
  { value: 'not_equal', label: 'Is not equal to', hasValue: true },
  { value: 'greater', label: 'Is greater than', hasValue: true },
  { value: 'less', label: 'Is less than', hasValue: true },
]

function FieldConditionsSection({
  conditions,
  allFields,
  currentKey,
  onChange,
}: {
  conditions: FieldConditions | undefined
  allFields: WorkingField[]
  currentKey: string
  onChange: (c: FieldConditions | undefined) => void
}) {
  const availableFields = allFields.filter((f) => f.key !== currentKey && f.def.type !== 'tab' && f.def.type !== 'section')
  const rules = conditions?.rule_conditions ?? []

  function addRule() {
    const firstField = availableFields[0]?.key ?? ''
    const newRule: FieldConditionRule = { field: firstField, validation: 'not_empty' }
    onChange({
      validation: conditions?.validation ?? 'any',
      rule_conditions: [...rules, newRule],
    })
  }

  function removeRule(idx: number) {
    const next = rules.filter((_, i) => i !== idx)
    if (next.length === 0) {
      onChange(undefined)
    } else {
      onChange({ validation: conditions!.validation, rule_conditions: next })
    }
  }

  function updateRule(idx: number, patch: Partial<FieldConditionRule>) {
    onChange({
      validation: conditions!.validation,
      rule_conditions: rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    })
  }

  function setMode(v: 'any' | 'all') {
    onChange({ validation: v, rule_conditions: rules })
  }

  return (
    <>
      <SectionTitle>Field Conditions</SectionTitle>

      {rules.length > 0 && (
        <FormRow>
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span>If</span>
            <div className="relative">
              <select
                value={conditions!.validation}
                onChange={(e) => setMode(e.target.value as 'any' | 'all')}
                className="appearance-none pl-2 pr-6 py-1 border border-gray-200 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="any">any</option>
                <option value="all">all</option>
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>
            <span>of the following conditions are true</span>
          </div>
        </FormRow>
      )}

      <div className="space-y-2 mb-2">
        {rules.map((rule, idx) => {
          const valOpt = VALIDATION_OPTIONS.find((o) => o.value === rule.validation)
          return (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-xs text-gray-400 w-5 pt-2.5 flex-shrink-0 text-right">
                {idx === 0 ? 'if' : 'and'}
              </span>
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="relative">
                  <select
                    value={rule.field}
                    onChange={(e) => updateRule(idx, { field: e.target.value })}
                    className="w-full appearance-none px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {availableFields.length === 0 ? (
                      <option value="">No fields available</option>
                    ) : (
                      availableFields.map((f) => (
                        <option key={f.key} value={f.key}>
                          {(f.def as any).display_name || f.key}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    value={rule.validation}
                    onChange={(e) => updateRule(idx, { validation: e.target.value as FieldConditionRule['validation'], value: undefined })}
                    className="w-full appearance-none px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {VALIDATION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {valOpt?.hasValue && (
                  <input
                    type="text"
                    value={rule.value ?? ''}
                    onChange={(e) => updateRule(idx, { value: e.target.value || undefined })}
                    placeholder="Value..."
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => removeRule(idx)}
                className="mt-2 p-1 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={addRule}
        className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400 font-medium"
      >
        <Plus className="w-4 h-4" />
        Add a condition
      </button>
    </>
  )
}

// ─── Bloks options ────────────────────────────────────────────────────────────

type BloksTab = 'blocks' | 'folders' | 'tags'

function MultiSelectPicker({
  placeholder,
  selectedIds,
  items,
  loading,
  onToggle,
  onClearAll,
  renderItem,
}: {
  placeholder: string
  selectedIds: string[]
  items: Array<{ id: string; label: string; sublabel?: string }>
  loading?: boolean
  onToggle: (id: string) => void
  onClearAll: () => void
  renderItem?: (item: { id: string; label: string; sublabel?: string }) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const filtered = items.filter(
    (i) =>
      i.label.toLowerCase().includes(filter.toLowerCase()) ||
      (i.sublabel ?? '').toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="flex-1 relative min-w-0">
      <div
        onClick={() => { setOpen((v) => !v); setFilter('') }}
        className={`flex items-center gap-1.5 px-3 py-2 border rounded-r-lg cursor-pointer min-h-[40px] ${
          open ? 'border-teal-500 ring-2 ring-teal-200 dark:ring-teal-900' : 'border-gray-200 dark:border-gray-700'
        } bg-white dark:bg-gray-900`}
      >
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {selectedIds.length === 0 ? (
            <span className="text-sm text-teal-500 dark:text-teal-400">{placeholder}</span>
          ) : (
            selectedIds.map((id) => {
              const item = items.find((i) => i.id === id)
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-700 dark:text-gray-300"
                >
                  {item?.label ?? id}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggle(id) }}
                    className="text-gray-400 hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              )
            })
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClearAll() }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-72 overflow-y-auto">
            {items.length > 5 && (
              <div className="sticky top-0 bg-white dark:bg-gray-900 px-3 pt-2 pb-1 border-b border-gray-100 dark:border-gray-800">
                <input
                  autoFocus
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter..."
                  className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            {loading ? (
              <div className="px-4 py-3 text-sm text-gray-400">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400">No items found</div>
            ) : (
              filtered.map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => onToggle(item.id)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 dark:text-gray-100">{item.label}</p>
                    {item.sublabel && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">{item.sublabel}</p>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

function ModeDropdown({
  mode,
  onChange,
}: {
  mode: 'allow' | 'deny'
  onChange: (m: 'allow' | 'deny') => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-2 border border-r-0 border-gray-200 dark:border-gray-700 rounded-l-lg bg-white dark:bg-gray-900 h-full min-w-[80px]"
      >
        {mode === 'allow'
          ? <Unlock className="w-4 h-4 text-teal-600" />
          : <Lock className="w-4 h-4 text-gray-500" />
        }
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl min-w-[120px] overflow-hidden">
            {(['allow', 'deny'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { onChange(m); setOpen(false) }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${
                  mode === m ? 'bg-gray-50 dark:bg-gray-800 font-medium' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {m === 'allow'
                  ? <Unlock className="w-3.5 h-3.5 text-teal-600" />
                  : <Lock className="w-3.5 h-3.5 text-gray-500" />
                }
                <span className="capitalize text-gray-700 dark:text-gray-300">{m === 'allow' ? 'Allow' : 'Deny'}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function BloksOptions({
  def,
  onChange,
  spaceId,
  groups,
}: {
  def: BloksFieldDef
  onChange: (patch: Partial<BloksFieldDef>) => void
  spaceId?: string
  groups: ComponentGroup[]
}) {
  const [activeTab, setActiveTab] = useState<BloksTab>('blocks')
  const [components, setComponents] = useState<Array<{ name: string; display_name?: string; component_group_uuid?: string }>>([])
  const [tags, setTags] = useState<string[]>([])
  const [loadingComponents, setLoadingComponents] = useState(false)
  const [loadingTags, setLoadingTags] = useState(false)

  useEffect(() => {
    if (!def.restrict_components || !spaceId) return
    setLoadingComponents(true)
    fetch(`/api/admin/spaces/${spaceId}/components?per_page=500`)
      .then((r) => r.json())
      .then((data) => setComponents(data.components ?? []))
      .finally(() => setLoadingComponents(false))
    setLoadingTags(true)
    fetch(`/api/admin/spaces/${spaceId}/tags`)
      .then((r) => r.json())
      .then((data) => setTags((data.tags ?? []).map((t: any) => t.name ?? t)))
      .finally(() => setLoadingTags(false))
  }, [def.restrict_components, spaceId])

  // Derive mode from which list has content (default: allow)
  const blocksMode: 'allow' | 'deny' = (def.component_denylist?.length ?? 0) > 0 && !(def.component_whitelist?.length) ? 'deny' : 'allow'
  const foldersMode: 'allow' | 'deny' = (def.component_group_denylist?.length ?? 0) > 0 && !(def.component_group_whitelist?.length) ? 'deny' : 'allow'
  const tagsMode: 'allow' | 'deny' = (def.component_tag_denylist?.length ?? 0) > 0 && !(def.component_tag_whitelist?.length) ? 'deny' : 'allow'

  // Compute component items with group path
  const componentItems = components.map((c) => {
    const group = groups.find((g) => g.uuid === c.component_group_uuid)
    return { id: c.name, label: c.name, sublabel: group ? `/${group.name}` : undefined }
  })

  const groupItems = groups.map((g) => ({ id: g.uuid, label: g.name, sublabel: `/${g.name}` }))
  const tagItems = tags.map((t) => ({ id: t, label: t }))

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
          {/* Tab switcher */}
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

          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Access management</p>

          {/* Blocks tab */}
          {activeTab === 'blocks' && (
            <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-visible">
              <ModeDropdown
                mode={blocksMode}
                onChange={(m) => {
                  const current = m === 'allow' ? (def.component_denylist ?? []) : (def.component_whitelist ?? [])
                  if (m === 'allow') onChange({ component_whitelist: current, component_denylist: [] })
                  else onChange({ component_denylist: current, component_whitelist: [] })
                }}
              />
              <MultiSelectPicker
                placeholder="Select blocks"
                selectedIds={blocksMode === 'allow' ? (def.component_whitelist ?? []) : (def.component_denylist ?? [])}
                items={componentItems}
                loading={loadingComponents}
                onToggle={(id) => {
                  const key = blocksMode === 'allow' ? 'component_whitelist' : 'component_denylist'
                  const current = (def[key] ?? []) as string[]
                  onChange({ [key]: current.includes(id) ? current.filter((x) => x !== id) : [...current, id] })
                }}
                onClearAll={() => {
                  const key = blocksMode === 'allow' ? 'component_whitelist' : 'component_denylist'
                  onChange({ [key]: [] })
                }}
              />
            </div>
          )}

          {/* Folders tab */}
          {activeTab === 'folders' && (
            <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-visible">
              <ModeDropdown
                mode={foldersMode}
                onChange={(m) => {
                  const current = m === 'allow' ? (def.component_group_denylist ?? []) : (def.component_group_whitelist ?? [])
                  if (m === 'allow') onChange({ component_group_whitelist: current, component_group_denylist: [] })
                  else onChange({ component_group_denylist: current, component_group_whitelist: [] })
                }}
              />
              <MultiSelectPicker
                placeholder="Select folders"
                selectedIds={foldersMode === 'allow' ? (def.component_group_whitelist ?? []) : (def.component_group_denylist ?? [])}
                items={groupItems}
                onToggle={(id) => {
                  const key = foldersMode === 'allow' ? 'component_group_whitelist' : 'component_group_denylist'
                  const current = (def[key] ?? []) as string[]
                  onChange({ [key]: current.includes(id) ? current.filter((x) => x !== id) : [...current, id] })
                }}
                onClearAll={() => {
                  const key = foldersMode === 'allow' ? 'component_group_whitelist' : 'component_group_denylist'
                  onChange({ [key]: [] })
                }}
              />
            </div>
          )}

          {/* Tags tab */}
          {activeTab === 'tags' && (
            <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-visible">
              <ModeDropdown
                mode={tagsMode}
                onChange={(m) => {
                  const current = m === 'allow' ? (def.component_tag_denylist ?? []) : (def.component_tag_whitelist ?? [])
                  if (m === 'allow') onChange({ component_tag_whitelist: current, component_tag_denylist: [] })
                  else onChange({ component_tag_denylist: current, component_tag_whitelist: [] })
                }}
              />
              <MultiSelectPicker
                placeholder="Select tags"
                selectedIds={tagsMode === 'allow' ? (def.component_tag_whitelist ?? []) : (def.component_tag_denylist ?? [])}
                items={tagItems}
                loading={loadingTags}
                onToggle={(id) => {
                  const key = tagsMode === 'allow' ? 'component_tag_whitelist' : 'component_tag_denylist'
                  const current = (def[key] ?? []) as string[]
                  onChange({ [key]: current.includes(id) ? current.filter((x) => x !== id) : [...current, id] })
                }}
                onClearAll={() => {
                  const key = tagsMode === 'allow' ? 'component_tag_whitelist' : 'component_tag_denylist'
                  onChange({ [key]: [] })
                }}
              />
            </div>
          )}

          {/* Min/Max */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <FormRow>
              <Label>Minimum blocks</Label>
              <NumberStepper value={def.minimum} onChange={(v) => onChange({ minimum: v })} min={0} />
            </FormRow>
            <FormRow>
              <Label>Maximum blocks</Label>
              <NumberStepper value={def.maximum} onChange={(v) => onChange({ maximum: v })} min={0} />
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
  )
}

// ─── Field type selector ──────────────────────────────────────────────────────

function FieldTypePicker({
  filter,
  setFilter,
  selected,
  onSelect,
}: {
  filter: string
  setFilter: (v: string) => void
  selected: FieldType
  onSelect: (t: FieldType) => void
}) {
  const filtered = ADDABLE_FIELD_TYPES.filter((ft) =>
    ft.label.toLowerCase().includes(filter.toLowerCase())
  )
  return (
    <div className="p-3">
      <div className="relative mb-2">
        <input
          autoFocus
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter field types"
          className="w-full pl-8 pr-3 py-1.5 border border-teal-400 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none"
        />
        <svg className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <div className="grid grid-cols-4 gap-1 max-h-52 overflow-y-auto">
        {filtered.map((ft) => (
          <button
            key={ft.type}
            type="button"
            onClick={() => onSelect(ft.type)}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-colors ${
              selected === ft.type ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
            }`}
          >
            <FieldIcon type={ft.type} size={24} />
            <span className="text-[9px] text-gray-600 dark:text-gray-400 leading-tight text-center">{ft.label}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-4 text-center py-4 text-sm text-gray-400">No types found</div>
        )}
      </div>
    </div>
  )
}

function FieldTypeSelector({ value, onChange }: { value: FieldType; onChange: (t: FieldType) => void }) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const label = FIELD_TYPE_LABELS[value] ?? value

  return (
    <FormRow>
      <Label>Field type</Label>
      <div className="relative">
        <button
          type="button"
          onClick={() => { setOpen((v) => !v); setFilter('') }}
          className="w-full flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
        >
          <FieldIcon type={value} size={20} />
          <span className="flex-1 text-left text-sm text-gray-900 dark:text-gray-100">{label}</span>
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl">
              <FieldTypePicker
                filter={filter}
                setFilter={setFilter}
                selected={value}
                onSelect={(t) => { onChange(t); setOpen(false) }}
              />
            </div>
          </>
        )}
      </div>
    </FormRow>
  )
}

// ─── Main FieldEditor component ───────────────────────────────────────────────

interface FieldEditorProps {
  field: WorkingField
  allFields: WorkingField[]
  spaceId?: string
  groups?: ComponentGroup[]
  onSave: (key: string, updatedDef: AnyFieldDef) => void
  onBack: () => void
}

export function FieldEditor({ field, allFields, spaceId, groups = [], onSave, onBack }: FieldEditorProps) {
  const [def, setDef] = useState<AnyFieldDef>({ ...field.def })
  const [editingKey, setEditingKey] = useState(false)
  const [keyValue, setKeyValue] = useState(field.key)

  function patch(updates: any) {
    setDef((prev) => ({ ...prev, ...updates }))
  }

  function handleSave() {
    onSave(keyValue, def)
  }

  const type = def.type as FieldType

  const commonHasRequired = !['table', 'section', 'boolean'].includes(type)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Field type */}
        <FieldTypeSelector
          value={type}
          onChange={(t) => setDef({ type: t } as AnyFieldDef)}
        />

        {/* Display name */}
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

        {/* Field name (technical key, mostly read-only) */}
        <FormRow>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Field name</span>
            <TooltipHint text="Technical name used in the API response JSON. Cannot contain spaces. Example: news_items, hero_title." />
          </div>
          {editingKey ? (
            <input
              autoFocus
              type="text"
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value.replace(/\s/g, '_').toLowerCase())}
              onBlur={() => setEditingKey(false)}
              onKeyDown={(e) => { if (e.key === 'Enter') setEditingKey(false) }}
              className="w-full px-3 py-2 border border-teal-400 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          ) : (
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <span className="text-sm font-mono text-gray-500 dark:text-gray-400">{keyValue}</span>
              <button type="button" onClick={() => setEditingKey(true)} className="text-gray-400 hover:text-gray-600">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </FormRow>

        {/* Required */}
        {commonHasRequired && (
          <CheckboxRow
            label="Required field"
            checked={!!(def as any).required}
            onChange={(v) => patch({ required: v || undefined })}
            tooltip="If enabled, the field must have a value before the story can be published."
          />
        )}

        {/* Translatable */}
        <CheckboxRow
          label="Translatable"
          checked={!!(def as any).translatable}
          onChange={(v) => patch({ translatable: v || undefined })}
          tooltip="Defines if the field can be translated using the field level translations feature. Enable this feature by adding languages in the space settings area."
        />

        {/* Description */}
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

        {/* Type-specific options */}
        {type === 'bloks' && <BloksOptions def={def as BloksFieldDef} onChange={patch} spaceId={spaceId} groups={groups} />}
        {type === 'text' && <TextOptions def={def} onChange={patch} />}
        {type === 'textarea' && <TextareaOptions def={def} onChange={patch} />}
        {type === 'richtext' && <RichtextOptions def={def} onChange={patch} />}
        {type === 'markdown' && <MarkdownOptions def={def} onChange={patch} />}
        {type === 'number' && <NumberOptions def={def} onChange={patch} />}
        {type === 'datetime' && <DatetimeOptions def={def} onChange={patch} />}
        {type === 'boolean' && <BooleanOptions def={def} onChange={patch} />}
        {type === 'option' && <SingleOptionOptions def={def as OptionFieldDef} onChange={patch} spaceId={spaceId} />}
        {type === 'options' && <MultiOptionsOptions def={def as OptionsFieldDef} onChange={patch} spaceId={spaceId} />}
        {type === 'multilink' && <ReferencesOptions def={def} onChange={patch} spaceId={spaceId} />}
        {(type === 'asset' || type === 'multiasset') && <AssetOptions def={def} onChange={patch} spaceId={spaceId} />}
        {type === 'link' && <LinkOptions def={def} onChange={patch} spaceId={spaceId} />}
        {type === 'section' && (
          <GroupOptions def={def} allFields={allFields} currentKey={keyValue} onChange={patch} />
        )}

        {/* Field Conditions — available for all non-tab types */}
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
  )
}
