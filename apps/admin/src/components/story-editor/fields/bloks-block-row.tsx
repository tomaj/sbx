'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Trash2, Copy, Scissors } from 'lucide-react';
import { SortableDragHandle } from '@/components/ui/sortable-list';
import { parseSchema } from '@/components/block-library/edit-block-modal/types';
import type { ComponentMeta, ComponentGroup } from '../types';
import { FieldRenderer } from '../field-renderer';
import { evaluateFieldConditions } from '../field-conditions';

interface BlockItem {
  _uid: string;
  component: string;
  [key: string]: any;
}

function getBlockPreview(
  block: BlockItem,
  schema: Record<string, any> | undefined,
  previewField: string | null,
): string {
  if (!schema) return '';
  if (previewField && block[previewField] != null) {
    const val = block[previewField];
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
  }
  const entries = Object.entries(schema)
    .filter(([, def]) => def.type === 'text' || def.type === 'textarea')
    .sort(([, a], [, b]) => (a.pos ?? 0) - (b.pos ?? 0));
  if (entries.length > 0) {
    const [key] = entries[0];
    const val = block[key];
    if (typeof val === 'string' && val.length > 0) return val;
  }
  return '';
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderPreviewTmpl(tmpl: string, data: Record<string, any>): string {
  return tmpl
    .replace(/\{\{@image\(it\.(\w+)(?:\.(\w+))?\)\s*\/?\}\}/g, (_, key, prop) => {
      const obj = data[key];
      if (!obj) return '';
      const url = prop
        ? obj && typeof obj === 'object'
          ? obj[prop]
          : null
        : typeof obj === 'string'
          ? obj
          : obj?.filename;
      if (!url || typeof url !== 'string') return '';
      return `<img src="${escapeHtml(url)}" style="max-width:120px;max-height:80px;object-fit:cover;border-radius:4px;margin-top:4px;" />`;
    })
    .replace(/\{\{\s*it\.(\w+)\.length\s*\}\}/g, (_, key) => {
      const val = data[key];
      return Array.isArray(val) ? String(val.length) : '0';
    })
    .replace(/\{\{\s*it\.(\w+)\.(\w+)\s*\}\}/g, (_, key, prop) => {
      const obj = data[key];
      if (obj && typeof obj === 'object' && obj[prop] != null) return escapeHtml(String(obj[prop]));
      return '';
    })
    .replace(/\{\{\s*it\.(\w+)\s*\}\}/g, (_, key) => {
      const val = data[key];
      if (val === undefined || val === null) return '';
      if (typeof val === 'string') return escapeHtml(val);
      return escapeHtml(String(val));
    });
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
  schema: Record<string, any>;
  data: Record<string, any>;
  allComponents: ComponentMeta[];
  allGroups: ComponentGroup[];
  spaceId: string;
  onChange: (key: string, value: any) => void;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const { tabs, fields } = parseSchema(schema);
  const visibleTabs = tabs.filter((t) => fields.some((f) => f.tabKey === t.key));
  const hasTabs = visibleTabs.length > 1;

  const currentTab = hasTabs ? (visibleTabs[activeTab] ?? visibleTabs[0]) : visibleTabs[0];
  const visibleFields = (
    hasTabs ? fields.filter((f) => f.tabKey === currentTab?.key) : fields
  ).filter((f) => evaluateFieldConditions((f.def as any).conditions, data));

  if (visibleFields.length === 0 && !hasTabs) {
    return <p className="text-sm text-gray-400">No fields defined</p>;
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
  );
}

// ── BlockRow ──────────────────────────────────────────────────────────────────

export interface BlockRowProps {
  block: BlockItem;
  allComponents: ComponentMeta[];
  allGroups: ComponentGroup[];
  spaceId: string;
  onUpdate: (block: BlockItem) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}

export function BlockRow({
  block,
  allComponents,
  allGroups,
  spaceId,
  onUpdate,
  onRemove,
  onDuplicate,
}: BlockRowProps) {
  const [expanded, setExpanded] = useState(false);

  const componentMeta = allComponents.find((c) => c.name === block.component);
  const schema = componentMeta?.schema;
  const displayName = componentMeta?.display_name || block.component;
  const previewTmpl = componentMeta?.preview_tmpl;
  const preview = previewTmpl
    ? null
    : getBlockPreview(block, schema, componentMeta?.preview_field ?? null);

  function handleFieldChange(key: string, value: any) {
    onUpdate({ ...block, [key]: value });
  }

  return (
    <div className="group transition-all">
      {/* Block header */}
      <div
        className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${
          expanded ? 'bg-gray-50 dark:bg-gray-800/30' : ''
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Grip — hover only */}
        <div
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <SortableDragHandle className="text-gray-300 dark:text-gray-600" />
        </div>

        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {displayName}
          </div>
          {previewTmpl ? (
            <div
              className="text-xs text-gray-400 dark:text-gray-500 mt-0.5"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: intentional — renders CMS preview template from trusted admin config, not user input
              dangerouslySetInnerHTML={{ __html: renderPreviewTmpl(previewTmpl, block) }}
            />
          ) : preview ? (
            <div className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
              {preview}
            </div>
          ) : null}
        </div>

        {/* Actions — hover only */}
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
    </div>
  );
}
