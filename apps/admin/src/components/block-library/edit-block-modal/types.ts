export type FieldType =
  | 'bloks'
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'markdown'
  | 'number'
  | 'datetime'
  | 'boolean'
  | 'option'
  | 'options'
  | 'multilink'
  | 'asset'
  | 'multiasset'
  | 'link'
  | 'table'
  | 'section'
  | 'custom'
  | 'tab'

export interface FieldConditionRule {
  field: string
  validation: 'empty' | 'not_empty' | 'equal' | 'not_equal' | 'greater' | 'less'
  value?: string
}

export interface FieldConditions {
  validation: 'any' | 'all'
  rule_conditions: FieldConditionRule[]
}

export interface BaseFieldDef {
  type: FieldType
  display_name?: string
  required?: boolean
  translatable?: boolean
  description?: string
  tooltip?: boolean
  default_value?: any
  conditions?: FieldConditions
}

export interface TextFieldDef extends BaseFieldDef {
  type: 'text'
  rtl?: boolean
  max_length?: number
  regex?: string
}

export interface TextareaFieldDef extends BaseFieldDef {
  type: 'textarea'
  rtl?: boolean
  max_length?: number
  regex?: string
}

export interface RichtextFieldDef extends BaseFieldDef {
  type: 'richtext'
  max_length?: number
  customize_toolbar?: boolean
  toolbar?: string[]
  custom_class?: string
}

export interface MarkdownFieldDef extends BaseFieldDef {
  type: 'markdown'
  rtl?: boolean
  rich_text_as_default?: boolean
  allow_empty_paragraphs?: boolean
  customize_toolbar?: boolean
}

export interface NumberFieldDef extends BaseFieldDef {
  type: 'number'
  min_value?: number
  max_value?: number
  decimals?: number
  steps?: number
}

export interface DatetimeFieldDef extends BaseFieldDef {
  type: 'datetime'
  disable_time?: boolean
}

export interface BooleanFieldDef extends BaseFieldDef {
  type: 'boolean'
  inline_label?: boolean
  default_value?: boolean
}

export interface OptionFieldDef extends BaseFieldDef {
  type: 'option'
  source?: 'self' | 'internal' | 'internal_stories' | 'internal_languages' | 'external_datasource'
  // self
  options?: Array<{ name: string; value: string; _uid?: string }>
  exclude_empty_option?: boolean
  // internal (datasource)
  datasource_slug?: string
  // internal_stories
  filter_content_type?: string[]
  allow_advanced_search?: boolean
  use_uuid?: boolean
  link_scope?: string
  appearance?: 'link' | 'card'
  // external_datasource
  external_datasource?: string
}

export interface OptionsFieldDef extends BaseFieldDef {
  type: 'options'
  source?: 'self' | 'internal' | 'internal_stories' | 'internal_languages' | 'external_datasource'
  // self
  options?: Array<{ name: string; value: string; _uid?: string }>
  exclude_empty_option?: boolean
  // internal (datasource)
  datasource_slug?: string
  // internal_stories
  filter_content_type?: string[]
  allow_advanced_search?: boolean
  use_uuid?: boolean
  link_scope?: string
  appearance?: 'link' | 'card'
  // external_datasource
  external_datasource?: string
  min?: number
  max?: number
}

export interface MultilinkFieldDef extends BaseFieldDef {
  type: 'multilink'
  link_scope?: string
  force_link_scope?: boolean
  restrict_content_types?: boolean
  component_whitelist?: string[]
  allow_target_blank?: boolean
  show_anchor?: boolean
  asset_link_type?: boolean
  email_link_type?: boolean
  allow_custom_attributes?: boolean
  enable_advanced_search?: boolean
}

export interface AssetFieldDef extends BaseFieldDef {
  type: 'asset'
  allow_external_url?: boolean
  filetypes?: string[]
  asset_folder_id?: number | null
}

export interface MultiassetFieldDef extends BaseFieldDef {
  type: 'multiasset'
  allow_external_url?: boolean
  filetypes?: string[]
  asset_folder_id?: number | null
}

export interface LinkFieldDef extends BaseFieldDef {
  type: 'link'
  link_scope?: string
  force_link_scope?: boolean
  restrict_content_types?: boolean
  component_whitelist?: string[]
  allow_target_blank?: boolean
  show_anchor?: boolean
  asset_link_type?: boolean
  email_link_type?: boolean
  allow_custom_attributes?: boolean
}

export interface TableFieldDef extends BaseFieldDef {
  type: 'table'
}

export interface CustomFieldDef extends BaseFieldDef {
  type: 'custom'
  field_type?: string
  options?: any[]
}

export interface SectionFieldDef extends BaseFieldDef {
  type: 'section'
  keys?: string[]
}

export interface BloksFieldDef extends BaseFieldDef {
  type: 'bloks'
  restrict_components?: boolean
  restrict_type?: '' | 'groups'
  component_whitelist?: string[]
  component_group_whitelist?: string[]
  component_tag_whitelist?: string[]
  component_denylist?: string[]
  component_group_denylist?: string[]
  component_tag_denylist?: string[]
  minimum?: number
  maximum?: number
}

export interface TabFieldDef {
  type: 'tab'
  display_name: string
  pos: number
  keys?: string[]
}

export type AnyFieldDef =
  | TextFieldDef
  | TextareaFieldDef
  | RichtextFieldDef
  | MarkdownFieldDef
  | NumberFieldDef
  | DatetimeFieldDef
  | BooleanFieldDef
  | OptionFieldDef
  | OptionsFieldDef
  | MultilinkFieldDef
  | AssetFieldDef
  | MultiassetFieldDef
  | LinkFieldDef
  | TableFieldDef
  | SectionFieldDef
  | BloksFieldDef
  | CustomFieldDef
  | TabFieldDef

// ─── Working model ────────────────────────────────────────────────────────────

export interface WorkingTab {
  key: string
  name: string
}

export interface WorkingField {
  key: string
  tabKey: string
  def: AnyFieldDef
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_TAB_KEY = '__tab_general'

export const ADDABLE_FIELD_TYPES: Array<{ type: FieldType; label: string }> = [
  { type: 'bloks', label: 'Blocks' },
  { type: 'text', label: 'Text' },
  { type: 'textarea', label: 'Textarea' },
  { type: 'richtext', label: 'Richtext' },
  { type: 'markdown', label: 'Markdown' },
  { type: 'number', label: 'Number' },
  { type: 'datetime', label: 'Date/Time' },
  { type: 'boolean', label: 'Boolean' },
  { type: 'option', label: 'Single-Option' },
  { type: 'options', label: 'Multi-Options' },
  { type: 'multilink', label: 'References' },
  { type: 'asset', label: 'Asset' },
  { type: 'multiasset', label: 'Multi-Assets' },
  { type: 'link', label: 'Link' },
  { type: 'table', label: 'Table' },
  { type: 'section', label: 'Group' },
]

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  bloks: 'Blocks',
  text: 'Text',
  textarea: 'Textarea',
  richtext: 'Richtext',
  markdown: 'Markdown',
  number: 'Number',
  datetime: 'Date/Time',
  boolean: 'Boolean',
  option: 'Single-Option',
  options: 'Multi-Options',
  multilink: 'References',
  asset: 'Asset',
  multiasset: 'Multi-Assets',
  link: 'Link',
  table: 'Table',
  section: 'Group',
  custom: 'Plugin',
  tab: 'Tab',
}

// ─── Schema helpers ───────────────────────────────────────────────────────────

export function parseSchema(schema: Record<string, any>): { tabs: WorkingTab[]; fields: WorkingField[] } {
  const entries = Object.entries(schema)
    .map(([key, def]) => ({ key, def: def as any }))
    .sort((a, b) => (a.def.pos ?? 0) - (b.def.pos ?? 0))

  const tabEntries = entries.filter(({ def }) => def.type === 'tab')
  const fieldEntries = entries.filter(({ def }) => def.type !== 'tab')

  // Build tab list and map from tab key → set of explicitly assigned field keys
  const tabs: WorkingTab[] = []
  const tabKeyToFieldKeys = new Map<string, Set<string>>()
  let hasExplicitGeneral = false

  for (const { key, def } of tabEntries) {
    if (key === DEFAULT_TAB_KEY) {
      hasExplicitGeneral = true
      tabs.unshift({ key: DEFAULT_TAB_KEY, name: def.display_name || 'General' })
    } else {
      tabs.push({ key, name: def.display_name || key })
    }
    tabKeyToFieldKeys.set(key, new Set(def.keys ?? []))
  }

  // Collect all field keys explicitly assigned to some tab
  const assignedToTab = new Set<string>()
  for (const [, keySet] of tabKeyToFieldKeys) {
    for (const k of keySet) assignedToTab.add(k)
  }

  // Check if any fields are unassigned (→ General tab)
  const hasUnassigned = fieldEntries.some(({ key }) => !assignedToTab.has(key))

  // Ensure General tab exists if needed
  if (!hasExplicitGeneral && (tabEntries.length === 0 || hasUnassigned)) {
    tabs.unshift({ key: DEFAULT_TAB_KEY, name: 'General' })
  }

  if (tabs.length === 0) {
    tabs.push({ key: DEFAULT_TAB_KEY, name: 'General' })
  }

  // Assign each field to its tab using the keys arrays; unassigned → General
  const fields: WorkingField[] = fieldEntries.map(({ key, def }) => {
    let tabKey = DEFAULT_TAB_KEY
    for (const [tKey, keySet] of tabKeyToFieldKeys) {
      if (keySet.has(key)) {
        tabKey = tKey
        break
      }
    }
    const { pos: _pos, ...defWithoutPos } = def
    return { key, tabKey, def: defWithoutPos }
  })

  return { tabs, fields }
}

export function buildSchema(tabs: WorkingTab[], fields: WorkingField[]): Record<string, any> {
  const schema: Record<string, any> = {}
  let pos = 0

  tabs.forEach((tab) => {
    const tabFields = fields.filter((f) => f.tabKey === tab.key)

    // General tab is implicit in Storyblok schema — don't write it as a tab entry
    if (tab.key !== DEFAULT_TAB_KEY) {
      schema[tab.key] = {
        type: 'tab',
        display_name: tab.name,
        pos: pos++,
        keys: tabFields.map((f) => f.key),
      }
    }

    tabFields.forEach((field) => {
      schema[field.key] = { ...field.def, pos: pos++ }
    })
  })

  return schema
}

export function makeDefaultFieldDef(type: FieldType): AnyFieldDef {
  switch (type) {
    case 'text': return { type: 'text' }
    case 'textarea': return { type: 'textarea' }
    case 'richtext': return { type: 'richtext' }
    case 'markdown': return { type: 'markdown' }
    case 'number': return { type: 'number' }
    case 'datetime': return { type: 'datetime' }
    case 'boolean': return { type: 'boolean', default_value: false }
    case 'option': return { type: 'option', source: 'self', options: [] }
    case 'options': return { type: 'options', source: 'self', options: [] }
    case 'multilink': return { type: 'multilink', enable_advanced_search: true }
    case 'asset': return { type: 'asset' }
    case 'multiasset': return { type: 'multiasset' }
    case 'link': return { type: 'link' }
    case 'table': return { type: 'table' }
    case 'section': return { type: 'section', keys: [] }
    case 'bloks': return { type: 'bloks', component_whitelist: [], component_group_whitelist: [], component_tag_whitelist: [] }
    case 'custom': return { type: 'custom' }
    default: return { type } as AnyFieldDef
  }
}
