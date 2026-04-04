'use client';

import { useState, useEffect, useRef } from 'react';
import { X, RotateCcw, LayoutGrid } from 'lucide-react';
import { UnsavedChangesModal } from '@/components/ui/unsaved-changes-modal';
import type { ComponentGroup } from '../group-tree';
import type { Block } from '../block-list';
import { FieldsTab } from './fields-tab';
import { FieldEditor } from './field-editor';
import { ManageTabs } from './manage-tabs';
import { ConfigTab } from './config-tab';
import { VersionsTab, type ComponentVersionDetail } from './versions-tab';
import {
  type WorkingTab,
  type WorkingField,
  type AnyFieldDef,
  parseSchema,
  buildSchema,
} from './types';

type BlockType = 'nestable' | 'content_type' | 'universal';
type MainTab = 'fields' | 'config' | 'presets' | 'versions' | 'conditions';
type View = MainTab | 'edit-field' | 'manage-tabs';

interface EditBlockModalProps {
  open: boolean;
  block: Block;
  spaceId: string;
  groups: ComponentGroup[];
  onClose: () => void;
  onSaved: (updatedBlock: Block) => void;
}

function blockTypeOf(block: Block): BlockType {
  if (block.is_root && block.is_nestable) return 'universal';
  if (block.is_root) return 'content_type';
  return 'nestable';
}

// ─── Block Version Preview panel ───────────────────────────────────────────────

type PreviewTab = 'fields' | 'compare';

function BlockVersionPreview({
  version,
  spaceId,
  blockId,
  blockName,
  onClose,
  onRestored,
}: {
  version: ComponentVersionDetail;
  spaceId: string;
  blockId: string;
  blockName: string;
  onClose: () => void;
  onRestored: () => void;
}) {
  const [previewTab, setPreviewTab] = useState<PreviewTab>('fields');
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schema = version.schema ?? {};
  const fieldKeys = Object.keys(schema).filter((k) => !k.startsWith('_'));

  useEffect(() => {
    if (fieldKeys.length > 0 && !selectedField) {
      setSelectedField(fieldKeys[0]);
    }
  }, [selectedField, fieldKeys[0]]);

  async function handleRestore() {
    setRestoring(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/spaces/${spaceId}/components/${blockId}/versions/${version.id}/restore`,
        { method: 'PUT' },
      );
      if (!res.ok) throw new Error();
      onRestored();
      onClose();
    } catch {
      setError('Failed to restore version');
    } finally {
      setRestoring(false);
    }
  }

  const selectedDef = selectedField ? (schema[selectedField] as Record<string, any>) : null;

  return (
    <div className="relative flex flex-col flex-1 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-hidden min-w-0">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Block Versions</h2>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-500">{error}</span>}
          <button
            onClick={handleRestore}
            disabled={restoring}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {restoring ? 'Restoring...' : 'Restore Version'}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title="Close preview"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex items-center border-b border-gray-200 dark:border-gray-700 px-6">
        <button
          onClick={() => setPreviewTab('fields')}
          className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            previewTab === 'fields'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400 dark:border-teal-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Fields
        </button>
        <button
          onClick={() => setPreviewTab('compare')}
          className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            previewTab === 'compare'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400 dark:border-teal-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Compare
        </button>
      </div>

      {/* Fields tab: two-column layout */}
      {previewTab === 'fields' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: field list */}
          <div className="w-64 flex-shrink-0 overflow-y-auto border-r border-gray-200 dark:border-gray-700 py-4">
            <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              General
            </p>
            {fieldKeys.map((key) => {
              const def = schema[key] as Record<string, any>;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedField(key)}
                  className={`w-full text-left px-4 py-2.5 transition-colors ${
                    selectedField === key
                      ? 'bg-teal-50 dark:bg-teal-900/20 border-l-2 border-teal-500'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-2 border-transparent'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {key}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                    {def?.type ?? '—'}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Right: field detail */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedDef ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Field type
                  </label>
                  <div className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {selectedDef.type ?? '—'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Display name
                  </label>
                  <div className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
                    {selectedField}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Field name
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedField}</p>
                </div>
                {selectedDef.description !== undefined && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Description
                    </label>
                    <div className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 min-h-[60px]">
                      {selectedDef.description || <span className="text-gray-400">—</span>}
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {selectedDef.required !== undefined && (
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={!!selectedDef.required}
                        readOnly
                        className="rounded"
                      />
                      Required field
                    </label>
                  )}
                  {selectedDef.translatable !== undefined && (
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={!!selectedDef.translatable}
                        readOnly
                        className="rounded"
                      />
                      Translatable
                    </label>
                  )}
                </div>
                {selectedDef.default_value !== undefined && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Default value
                    </label>
                    <div className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
                      {String(selectedDef.default_value)}
                    </div>
                  </div>
                )}
                {selectedDef.max_length !== undefined && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Maximum characters
                    </label>
                    <div className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
                      {selectedDef.max_length}
                    </div>
                  </div>
                )}
                {selectedDef.regex !== undefined && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Regex validation
                    </label>
                    <div className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-mono text-gray-700 dark:text-gray-300">
                      {selectedDef.regex}
                    </div>
                  </div>
                )}
                {selectedDef.options &&
                  Array.isArray(selectedDef.options) &&
                  selectedDef.options.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Options
                      </label>
                      <div className="space-y-1">
                        {(selectedDef.options as any[]).map((opt, i) => (
                          <div
                            key={i}
                            className="px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400 flex gap-2"
                          >
                            <span className="font-medium">
                              {opt.name ?? opt.label ?? opt.value}
                            </span>
                            {opt.value && <span className="text-gray-400">→ {opt.value}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Select a field to preview</p>
            )}
          </div>
        </div>
      )}

      {/* Compare tab */}
      {previewTab === 'compare' && (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <p className="text-sm">Compare view coming soon</p>
        </div>
      )}
    </div>
  );
}

// ─── Main modal ────────────────────────────────────────────────────────────────

export function EditBlockModal({
  open,
  block,
  spaceId,
  groups,
  onClose,
  onSaved,
}: EditBlockModalProps) {
  // ─── Schema working state ──────────────────────────────────────────────────
  const [tabs, setTabs] = useState<WorkingTab[]>([]);
  const [fields, setFields] = useState<WorkingField[]>([]);

  // ─── Config state ──────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [blockType, setBlockType] = useState<BlockType>('nestable');
  const [groupUuid, setGroupUuid] = useState<string | null>(null);
  const [previewField, setPreviewField] = useState<string | null>(null);
  const [previewTmpl, setPreviewTmpl] = useState('');
  const [internalTags, setInternalTags] = useState<{ id: number; name: string }[]>([]);
  const [color, setColor] = useState<string | null>(null);
  const [icon, setIcon] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);

  // ─── Navigation state ──────────────────────────────────────────────────────
  const [mainTab, setMainTab] = useState<MainTab>('fields');
  const [view, setView] = useState<View>('fields');
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);

  // ─── Save state ────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const canMarkDirtyRef = useRef(false);

  // ─── Version preview state ─────────────────────────────────────────────────
  const [previewVersion, setPreviewVersion] = useState<ComponentVersionDetail | null>(null);

  // Initialize state when block changes or modal opens
  useEffect(() => {
    if (!open) return;

    const { tabs: parsedTabs, fields: parsedFields } = parseSchema(block.schema ?? {});
    setTabs(parsedTabs);
    setFields(parsedFields);
    setDisplayName(block.display_name ?? '');
    setDescription(block.description ?? '');
    setBlockType(blockTypeOf(block));
    setGroupUuid(block.component_group_uuid);
    setPreviewField(block.preview_field ?? null);
    setPreviewTmpl(block.preview_tmpl ?? '');
    setInternalTags(
      (block.internal_tags_list ?? []).map((t: any) => ({ id: Number(t.id), name: t.name })),
    );
    setColor(block.color ?? null);
    setIcon(block.icon ?? null);
    setImage(block.image ?? null);
    setView('fields');
    setMainTab('fields');
    setEditingFieldKey(null);
    setError(null);
    setPreviewVersion(null);
    setIsDirty(false);
    canMarkDirtyRef.current = false;
    const t = setTimeout(() => {
      canMarkDirtyRef.current = true;
    }, 300);
    return () => clearTimeout(t);
  }, [open, block]);

  // Keyboard close
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (previewVersion) {
          setPreviewVersion(null);
          return;
        }
        if (view === 'edit-field' || view === 'manage-tabs') {
          setView('fields');
          setMainTab('fields');
          setEditingFieldKey(null);
        } else {
          if (isDirty) {
            setShowUnsavedModal(true);
          } else {
            onClose();
          }
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, view, previewVersion, isDirty, onClose, handleSave]);

  if (!open) return null;

  function tryClose() {
    if (isDirty) {
      setShowUnsavedModal(true);
    } else {
      onClose();
    }
  }

  function navigateToMainTab(tab: MainTab) {
    setMainTab(tab);
    setView(tab);
    if (tab !== 'fields') setEditingFieldKey(null);
    if (tab !== 'versions') setPreviewVersion(null);
  }

  function handleEditField(key: string) {
    setEditingFieldKey(key);
    setView('edit-field');
  }

  function handleFieldSave(key: string, updatedDef: AnyFieldDef) {
    const oldKey = editingFieldKey!;
    setFields((prev) => prev.map((f) => (f.key === oldKey ? { ...f, key, def: updatedDef } : f)));
    setIsDirty(true);
    setView('fields');
    setMainTab('fields');
    setEditingFieldKey(null);
  }

  function handleBackFromEditField() {
    setView('fields');
    setMainTab('fields');
    setEditingFieldKey(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const schema = buildSchema(tabs, fields);
      const isNestable = blockType === 'nestable' || blockType === 'universal';
      const isRoot = blockType === 'content_type' || blockType === 'universal';

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
          icon: icon || null,
          image: image || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Failed to save');
      }

      const data = await res.json();
      setIsDirty(false);
      onSaved(data.component);
    } catch (e: any) {
      setError(e.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const showEditFieldTab = view === 'edit-field';
  const showManageTabsTab = view === 'manage-tabs';
  const editingField = editingFieldKey
    ? (fields.find((f) => f.key === editingFieldKey) ?? null)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          if (previewVersion) {
            setPreviewVersion(null);
            return;
          }
          if (view === 'edit-field' || view === 'manage-tabs') {
            setView('fields');
            setMainTab('fields');
            setEditingFieldKey(null);
          } else {
            tryClose();
          }
        }}
      />

      {/* Version preview panel — appears to the left of the main panel */}
      {previewVersion && (
        <BlockVersionPreview
          version={previewVersion}
          spaceId={spaceId}
          blockId={String(block.id)}
          blockName={block.display_name || block.name}
          onClose={() => setPreviewVersion(null)}
          onRestored={() => {
            setPreviewVersion(null);
            // Reload block data
            fetch(`/api/admin/spaces/${spaceId}/components/${block.id}`)
              .then((r) => r.json())
              .then((d) => d.component && onSaved(d.component))
              .catch(() => {});
          }}
        />
      )}

      {/* Main edit panel */}
      <div className="relative flex flex-col bg-white dark:bg-gray-900 w-full max-w-[640px] h-full shadow-2xl flex-shrink-0">
        {/* Header */}
        <div className="flex-shrink-0 px-8 pt-7 pb-0">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
              Edit &lsquo;{block.display_name || block.name}&rsquo;
            </h2>
            <button
              onClick={tryClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex items-center border-b border-gray-200 dark:border-gray-700 gap-0 overflow-x-auto">
            {showManageTabsTab ? (
              <TabItem label="Manage tabs" active onClick={() => {}} />
            ) : showEditFieldTab ? (
              <>
                <TabItem label="Fields" active={false} onClick={handleBackFromEditField} />
                <TabItem label="Edit field" active onClick={() => {}} />
              </>
            ) : (
              <TabItem
                label="Fields"
                active={mainTab === 'fields'}
                onClick={() => navigateToMainTab('fields')}
              />
            )}
            <TabItem
              label="Config"
              active={mainTab === 'config' && !showEditFieldTab && !showManageTabsTab}
              onClick={() => navigateToMainTab('config')}
            />
            <TabItem
              label="Presets"
              active={mainTab === 'presets' && !showEditFieldTab && !showManageTabsTab}
              onClick={() => navigateToMainTab('presets')}
            />
            <TabItem
              label="Versions"
              active={mainTab === 'versions' && !showEditFieldTab && !showManageTabsTab}
              onClick={() => navigateToMainTab('versions')}
            />
            <TabItem
              label="Conditions"
              active={mainTab === 'conditions' && !showEditFieldTab && !showManageTabsTab}
              onClick={() => navigateToMainTab('conditions')}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {view === 'fields' && (
            <FieldsTab
              tabs={tabs}
              fields={fields}
              onTabsChange={(v) => {
                setTabs(v);
                if (canMarkDirtyRef.current) setIsDirty(true);
              }}
              onFieldsChange={(v) => {
                setFields(v);
                if (canMarkDirtyRef.current) setIsDirty(true);
              }}
              onEditField={handleEditField}
              onManageTabs={() => {
                setView('manage-tabs');
                setMainTab('fields');
              }}
            />
          )}
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
          {view === 'manage-tabs' && (
            <ManageTabs
              tabs={tabs}
              onTabsChange={setTabs}
              onBack={() => {
                setView('fields');
                setMainTab('fields');
              }}
            />
          )}
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
              icon={icon}
              image={image}
              onDisplayNameChange={(v) => {
                setDisplayName(v);
                if (canMarkDirtyRef.current) setIsDirty(true);
              }}
              onDescriptionChange={(v) => {
                setDescription(v);
                if (canMarkDirtyRef.current) setIsDirty(true);
              }}
              onBlockTypeChange={(v) => {
                setBlockType(v);
                if (canMarkDirtyRef.current) setIsDirty(true);
              }}
              onGroupUuidChange={(v) => {
                setGroupUuid(v);
                if (canMarkDirtyRef.current) setIsDirty(true);
              }}
              onPreviewFieldChange={(v) => {
                setPreviewField(v);
                if (canMarkDirtyRef.current) setIsDirty(true);
              }}
              onPreviewTmplChange={(v) => {
                setPreviewTmpl(v);
                if (canMarkDirtyRef.current) setIsDirty(true);
              }}
              onInternalTagsChange={(v) => {
                setInternalTags(v);
                if (canMarkDirtyRef.current) setIsDirty(true);
              }}
              onColorChange={(v) => {
                setColor(v);
                if (canMarkDirtyRef.current) setIsDirty(true);
              }}
              onIconChange={(v) => {
                setIcon(v);
                if (canMarkDirtyRef.current) setIsDirty(true);
              }}
              onImageChange={(v) => {
                setImage(v);
                if (canMarkDirtyRef.current) setIsDirty(true);
              }}
            />
          )}
          {view === 'presets' && (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <p className="text-sm">TODO: Presets</p>
            </div>
          )}
          {view === 'versions' && (
            <VersionsTab
              spaceId={spaceId}
              blockId={String(block.id)}
              onPreview={setPreviewVersion}
              onRestored={() => {
                fetch(`/api/admin/spaces/${spaceId}/components/${block.id}`)
                  .then((r) => r.json())
                  .then((d) => d.component && onSaved(d.component))
                  .catch(() => {});
              }}
            />
          )}
          {view === 'conditions' && (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <p className="text-sm">TODO: Conditions</p>
            </div>
          )}
        </div>

        {/* Footer */}
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

      <UnsavedChangesModal
        open={showUnsavedModal}
        onConfirm={() => {
          setShowUnsavedModal(false);
          onClose();
        }}
        onCancel={() => setShowUnsavedModal(false)}
      />
    </div>
  );
}

function TabItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
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
  );
}
