'use client';

import { useState } from 'react';
import { Settings, X } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem, SortableDragHandle, arrayMove } from '@/components/ui/sortable-list';
import { FieldIcon } from './field-icon';
import {
  type WorkingField,
  type WorkingTab,
  type FieldType,
  ADDABLE_FIELD_TYPES,
  FIELD_TYPE_LABELS,
  DEFAULT_TAB_KEY,
  makeDefaultFieldDef,
} from './types';

function TooltipHint({ text }: { text: string }) {
  const [show, setShow] = useState(false);
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
  );
}

// ─── Field type picker popup ──────────────────────────────────────────────────

interface TypePickerProps {
  selected: FieldType;
  onSelect: (t: FieldType) => void;
  onClose: () => void;
}

function TypePicker({ selected, onSelect, onClose }: TypePickerProps) {
  const [filter, setFilter] = useState('');
  const filtered = ADDABLE_FIELD_TYPES.filter((ft) =>
    ft.label.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl">
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
          Filter field types
        </p>
        <div className="relative">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter field types"
            className="w-full pl-8 pr-3 py-1.5 border border-teal-400 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <svg
            className="absolute left-2.5 top-2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>
      <div className="p-3 grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
        {filtered.map((ft) => (
          <button
            key={ft.type}
            type="button"
            onClick={() => {
              onSelect(ft.type);
              onClose();
            }}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors text-center ${
              selected === ft.type
                ? 'bg-gray-100 dark:bg-gray-800'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
            }`}
          >
            <FieldIcon type={ft.type} size={28} />
            <span className="text-[10px] text-gray-600 dark:text-gray-400 leading-tight">
              {ft.label}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-4 text-center py-4 text-sm text-gray-400">No types found</div>
        )}
      </div>
    </div>
  );
}

/** Restricts drag movement to the vertical axis only */
const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

// ─── Field row ────────────────────────────────────────────────────────────────

interface FieldRowProps {
  field: WorkingField;
  onEdit: () => void;
  onDelete: () => void;
}

function FieldRow({ field, onEdit, onDelete }: FieldRowProps) {
  const label = FIELD_TYPE_LABELS[field.def.type as FieldType] ?? field.def.type;

  return (
    <SortableItem
      id={field.key}
      className="flex items-center gap-4 px-4 py-4 border rounded-lg cursor-pointer transition-all select-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600 mb-2"
      draggingClassName="opacity-50 shadow-lg border-teal-400"
    >
      <div onClick={onEdit} className="flex items-center gap-4 flex-1 min-w-0">
        <SortableDragHandle className="w-5 h-5" />
        <FieldIcon type={field.def.type as FieldType} size={28} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {field.key}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{label}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </SortableItem>
  );
}

// ─── FieldsTab ────────────────────────────────────────────────────────────────

interface FieldsTabProps {
  tabs: WorkingTab[];
  fields: WorkingField[];
  onTabsChange: (tabs: WorkingTab[]) => void;
  onFieldsChange: (fields: WorkingField[]) => void;
  onEditField: (key: string) => void;
  onManageTabs: () => void;
}

export function FieldsTab({
  tabs,
  fields,
  onTabsChange,
  onFieldsChange,
  onEditField,
  onManageTabs,
}: FieldsTabProps) {
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState<string>(tabs[0]?.key ?? DEFAULT_TAB_KEY);
  const [nameError, setNameError] = useState<string | null>(null);

  // Track which field is being dragged (for cross-tab drop highlighting)
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dragOverTabKey, setDragOverTabKey] = useState<string | null>(null);

  const _activeTab = tabs.find((t) => t.key === activeTabKey) ?? tabs[0];
  const tabFields = fields.filter((f) => f.tabKey === activeTabKey);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleAdd() {
    const name = newFieldName.trim().replace(/\s/g, '_').toLowerCase();
    if (!name) {
      setNameError('Field name is required');
      return;
    }
    if (fields.some((f) => f.key === name)) {
      setNameError('Field name already exists');
      return;
    }
    setNameError(null);

    const def = makeDefaultFieldDef(newFieldType);
    const newField: WorkingField = { key: name, tabKey: activeTabKey, def };
    onFieldsChange([...fields, newField]);
    setNewFieldName('');
  }

  function handleDelete(key: string) {
    onFieldsChange(fields.filter((f) => f.key !== key));
  }

  // ─── dnd-kit: reorder within the current tab ─────────────────────────────────
  function handleDragStart(event: { active: { id: string | number } }) {
    setDraggingKey(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDraggingKey(null);
    setDragOverTabKey(null);

    if (!over || active.id === over.id) return;

    const oldIndex = tabFields.findIndex((f) => f.key === active.id);
    const newIndex = tabFields.findIndex((f) => f.key === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(tabFields, oldIndex, newIndex);
    const otherFields = fields.filter((f) => f.tabKey !== activeTabKey);
    onFieldsChange([...otherFields, ...reordered]);
  }

  // ─── Cross-tab drop: native drag events on tab buttons ───────────────────────
  // When a dnd-kit drag is active, the pointer events on tabs are blocked by the
  // overlay. Instead we use a simple "drop zone" approach: during dnd-kit drag,
  // we detect pointer-over on tab buttons via onPointerEnter/Leave and commit the
  // cross-tab move in handleDragEnd if the pointer was last over a different tab.

  function handleTabPointerEnter(tabKey: string) {
    if (draggingKey && tabKey !== activeTabKey) {
      setDragOverTabKey(tabKey);
    }
  }

  function handleTabPointerLeave() {
    setDragOverTabKey(null);
  }

  // Override handleDragEnd to also handle cross-tab moves
  function handleDragEndWithCrossTab(event: DragEndEvent) {
    const { active } = event;
    const fieldKey = String(active.id);

    if (dragOverTabKey && dragOverTabKey !== activeTabKey) {
      // Cross-tab move: move the field to the target tab
      onFieldsChange(
        fields.map((f) => (f.key === fieldKey ? { ...f, tabKey: dragOverTabKey } : f)),
      );
      setActiveTabKey(dragOverTabKey);
      setDraggingKey(null);
      setDragOverTabKey(null);
      return;
    }

    handleDragEnd(event);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Add field row */}
      <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Name
          <TooltipHint text="Examples: news_items, body, columns, title, description or call_to_action_btn, ..." />
        </div>
        <div className="flex gap-2 relative">
          <input
            type="text"
            value={newFieldName}
            onChange={(e) => {
              setNewFieldName(e.target.value.replace(/\s/g, '_').toLowerCase());
              setNameError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
            placeholder="e.g. news_items, title, columns..."
            className={`flex-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              nameError ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'
            }`}
          />

          {/* Type picker button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTypePicker((v) => !v)}
              className="flex items-center justify-center w-10 h-10 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600"
              title="Select field type"
            >
              <FieldIcon type={newFieldType} size={22} />
            </button>

            {showTypePicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowTypePicker(false)} />
                <div className="absolute top-full right-0 mt-1 z-50 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl">
                  <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                      Filter field types
                    </p>
                    <FilteredTypeGrid
                      selected={newFieldType}
                      onSelect={(t) => {
                        setNewFieldType(t);
                        setShowTypePicker(false);
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-40"
          >
            Add
          </button>
        </div>
        {nameError && <p className="mt-1 text-xs text-red-500">{nameError}</p>}
      </div>

      {/* Tabs row */}
      <div className="flex items-center px-8 pt-3 border-b border-gray-100 dark:border-gray-800 gap-1">
        <div className="flex items-center gap-0.5 flex-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTabKey(tab.key)}
              onPointerEnter={() => handleTabPointerEnter(tab.key)}
              onPointerLeave={handleTabPointerLeave}
              className={`px-3 py-1.5 text-sm font-medium rounded-t-md whitespace-nowrap transition-colors ${
                dragOverTabKey === tab.key
                  ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                  : activeTabKey === tab.key
                    ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onManageTabs}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors flex-shrink-0"
          title="Manage tabs"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Field list */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {tabFields.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <p className="text-sm">No fields in this tab</p>
            <p className="text-xs mt-1">Add a field using the input above</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEndWithCrossTab}
          >
            <SortableContext
              items={tabFields.map((f) => f.key)}
              strategy={verticalListSortingStrategy}
            >
              {tabFields.map((field) => (
                <FieldRow
                  key={field.key}
                  field={field}
                  onEdit={() => onEditField(field.key)}
                  onDelete={() => handleDelete(field.key)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

// ─── Filtered type grid (inline version) ─────────────────────────────────────

function FilteredTypeGrid({
  selected,
  onSelect,
}: {
  selected: FieldType;
  onSelect: (t: FieldType) => void;
}) {
  const [filter, setFilter] = useState('');
  const filtered = ADDABLE_FIELD_TYPES.filter((ft) =>
    ft.label.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <>
      <div className="relative mb-2">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter field types"
          className="w-full pl-8 pr-3 py-1.5 border border-teal-400 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none"
        />
        <svg
          className="absolute left-2.5 top-2 w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <div className="grid grid-cols-4 gap-1 max-h-52 overflow-y-auto">
        {filtered.map((ft) => (
          <button
            key={ft.type}
            type="button"
            onClick={() => onSelect(ft.type)}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-colors ${
              selected === ft.type
                ? 'bg-gray-100 dark:bg-gray-800'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
            }`}
          >
            <FieldIcon type={ft.type} size={24} />
            <span className="text-[9px] text-gray-600 dark:text-gray-400 leading-tight text-center">
              {ft.label}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
