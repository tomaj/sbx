'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { ComponentGroup } from '../group-tree'
import type { Block } from '../block-list'
import { FieldsTab } from './fields-tab'
import { FieldEditor } from './field-editor'
import { ManageTabs } from './manage-tabs'
import { ConfigTab } from './config-tab'
import { VersionsTab } from './versions-tab'
import {
  type WorkingTab,
  type WorkingField,
  type AnyFieldDef,
  parseSchema,
  buildSchema,
} from './types'

type BlockType = 'nestable' | 'content_type' | 'universal'
type MainTab = 'fields' | 'config' | 'presets' | 'versions' | 'conditions'
type View = MainTab | 'edit-field' | 'manage-tabs'

interface EditBlockModalProps {
  open: boolean
  block: Block
  spaceId: string
  groups: ComponentGroup[]
  onClose: () => void
  onSaved: (updatedBlock: Block) => void
}

function blockTypeOf(block: Block): BlockType {
  if (block.is_root && block.is_nestable) return 'universal'
  if (block.is_root) return 'content_type'
  return 'nestable'
}

export function EditBlockModal({ open, block, spaceId, groups, onClose, onSaved }: EditBlockModalProps) {
  // ─── Schema working state ──────────────────────────────────────────────────
  const [tabs, setTabs] = useState<WorkingTab[]>([])
  const [fields, setFields] = useState<WorkingField[]>([])

  // ─── Config state ──────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [blockType, setBlockType] = useState<BlockType>('nestable')
  const [groupUuid, setGroupUuid] = useState<string | null>(null)
  const [previewField, setPreviewField] = useState<string | null>(null)
  const [previewTmpl, setPreviewTmpl] = useState('')
  const [internalTags, setInternalTags] = useState<{ id: number; name: string }[]>([])
  const [color, setColor] = useState<string | null>(null)

  // ─── Navigation state ──────────────────────────────────────────────────────
  const [mainTab, setMainTab] = useState<MainTab>('fields')
  const [view, setView] = useState<View>('fields')
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null)

  // ─── Save state ────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize state when block changes or modal opens
  useEffect(() => {
    if (!open) return

    const { tabs: parsedTabs, fields: parsedFields } = parseSchema(block.schema ?? {})
    setTabs(parsedTabs)
    setFields(parsedFields)
    setDisplayName(block.display_name ?? '')
    setDescription(block.description ?? '')
    setBlockType(blockTypeOf(block))
    setGroupUuid(block.component_group_uuid)
    setPreviewField(block.preview_field ?? null)
    setPreviewTmpl(block.preview_tmpl ?? '')
    setInternalTags(block.internal_tags_list ?? [])
    setColor(block.color ?? null)
    setView('fields')
    setMainTab('fields')
    setEditingFieldKey(null)
    setError(null)
  }, [open, block])

  // Keyboard close
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && view === 'fields') onClose()
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, view, tabs, fields, displayName, description, blockType, groupUuid])

  if (!open) return null

  function navigateToMainTab(tab: MainTab) {
    setMainTab(tab)
    setView(tab)
    if (tab !== 'fields') setEditingFieldKey(null)
  }

  function handleEditField(key: string) {
    setEditingFieldKey(key)
    setView('edit-field')
  }

  function handleFieldSave(key: string, updatedDef: AnyFieldDef) {
    // Update fields - handle key rename
    const oldKey = editingFieldKey!
    setFields((prev) =>
      prev.map((f) =>
        f.key === oldKey ? { ...f, key, def: updatedDef } : f
      )
    )
    setView('fields')
    setMainTab('fields')
    setEditingFieldKey(null)
  }

  function handleBackFromEditField() {
    setView('fields')
    setMainTab('fields')
    setEditingFieldKey(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const schema = buildSchema(tabs, fields)
      const isNestable = blockType === 'nestable' || blockType === 'universal'
      const isRoot = blockType === 'content_type' || blockType === 'universal'

      const res = await fetch(`/api/admin/spaces/${spaceId}/components/${block.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema,
          display_name: displayName || null,
          description: description || null,
          is_nestable: isNestable,
          is_root: isRoot,
          component_group_uuid: groupUuid,
          preview_field: previewField || null,
          preview_tmpl: previewTmpl || null,
          internal_tags_list: internalTags,
          internal_tag_ids: internalTags.map((t) => String(t.id)),
          color: color || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message ?? 'Failed to save')
      }

      const data = await res.json()
      onSaved(data.component)
    } catch (e: any) {
      setError(e.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Determine which tabs to show in the tab bar
  const showEditFieldTab = view === 'edit-field'
  const showManageTabsTab = view === 'manage-tabs'

  const editingField = editingFieldKey ? fields.find((f) => f.key === editingFieldKey) ?? null : null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          if (view === 'edit-field' || view === 'manage-tabs') {
            setView('fields')
            setMainTab('fields')
            setEditingFieldKey(null)
          } else {
            onClose()
          }
        }}
      />

      {/* Panel */}
      <div className="relative flex flex-col bg-white dark:bg-gray-900 w-full max-w-[640px] h-full shadow-2xl">
        {/* Header */}
        <div className="flex-shrink-0 px-8 pt-7 pb-0">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
              Edit &lsquo;{block.display_name || block.name}&rsquo;
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex items-center border-b border-gray-200 dark:border-gray-700 gap-0 overflow-x-auto">
            {/* Fields or Edit field or Manage tabs */}
            {showManageTabsTab ? (
              <TabItem
                label="Manage tabs"
                active
                onClick={() => {}}
              />
            ) : showEditFieldTab ? (
              <>
                <TabItem
                  label="Fields"
                  active={false}
                  onClick={handleBackFromEditField}
                />
                <TabItem
                  label="Edit field"
                  active
                  onClick={() => {}}
                />
              </>
            ) : (
              <TabItem
                label="Fields"
                active={mainTab === 'fields'}
                onClick={() => navigateToMainTab('fields')}
              />
            )}

            <TabItem label="Config" active={mainTab === 'config' && !showEditFieldTab && !showManageTabsTab} onClick={() => navigateToMainTab('config')} />
            <TabItem label="Presets" active={mainTab === 'presets' && !showEditFieldTab && !showManageTabsTab} onClick={() => navigateToMainTab('presets')} />
            <TabItem label="Versions" active={mainTab === 'versions' && !showEditFieldTab && !showManageTabsTab} onClick={() => navigateToMainTab('versions')} />
            <TabItem label="Conditions" active={mainTab === 'conditions' && !showEditFieldTab && !showManageTabsTab} onClick={() => navigateToMainTab('conditions')} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Fields tab */}
          {view === 'fields' && (
            <FieldsTab
              tabs={tabs}
              fields={fields}
              onTabsChange={setTabs}
              onFieldsChange={setFields}
              onEditField={handleEditField}
              onManageTabs={() => {
                setView('manage-tabs')
                setMainTab('fields')
              }}
            />
          )}

          {/* Edit field */}
          {view === 'edit-field' && editingField && (
            <FieldEditor
              field={editingField}
              allFields={fields}
              spaceId={spaceId}
              groups={groups}
              onSave={handleFieldSave}
              onBack={handleBackFromEditField}
            />
          )}

          {/* Manage tabs */}
          {view === 'manage-tabs' && (
            <ManageTabs
              tabs={tabs}
              onTabsChange={setTabs}
              onBack={() => {
                setView('fields')
                setMainTab('fields')
              }}
            />
          )}

          {/* Config tab */}
          {view === 'config' && (
            <ConfigTab
              spaceId={spaceId}
              displayName={displayName}
              description={description}
              blockType={blockType}
              groupUuid={groupUuid}
              groups={groups}
              schemaFields={fields}
              previewField={previewField}
              previewTmpl={previewTmpl}
              internalTags={internalTags}
              color={color}
              onDisplayNameChange={setDisplayName}
              onDescriptionChange={setDescription}
              onBlockTypeChange={setBlockType}
              onGroupUuidChange={setGroupUuid}
              onPreviewFieldChange={setPreviewField}
              onPreviewTmplChange={setPreviewTmpl}
              onInternalTagsChange={setInternalTags}
              onColorChange={setColor}
            />
          )}

          {/* Presets - TODO */}
          {view === 'presets' && (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <p className="text-sm">TODO: Presets</p>
            </div>
          )}

          {/* Versions tab */}
          {view === 'versions' && (
            <VersionsTab createdAt={block.created_at} updatedAt={block.updated_at} />
          )}

          {/* Conditions - TODO */}
          {view === 'conditions' && (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <p className="text-sm">TODO: Conditions</p>
            </div>
          )}
        </div>

        {/* Footer save bar (only on fields/config/presets/versions/conditions, not on edit-field/manage-tabs) */}
        {view !== 'edit-field' && view !== 'manage-tabs' && (
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 px-8 py-4 flex items-center justify-end gap-3">
            {error && <p className="text-xs text-red-500 flex-1">{error}</p>}
            <span className="text-xs text-gray-400 hidden sm:block">⌘ + S</span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function TabItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
        active
          ? 'border-teal-600 text-teal-600 dark:text-teal-400 dark:border-teal-400'
          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
      }`}
    >
      {label}
    </button>
  )
}
