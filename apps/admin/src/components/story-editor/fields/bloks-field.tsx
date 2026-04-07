'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { SortableList, SortableItem } from '@/components/ui/sortable-list';
import type { BloksFieldDef } from '@/components/block-library/edit-block-modal/types';
import type { ComponentMeta, ComponentGroup } from '../types';
import { InsertBlockPanel } from '../insert-block-panel';
import { BlockRow } from './bloks-block-row';
import { AddBlockDivider } from './bloks-add-divider';

function uuidv4() {
  return crypto.randomUUID();
}

interface BlockItem {
  _uid: string;
  component: string;
  [key: string]: any;
}

interface Props {
  fieldKey: string;
  def: BloksFieldDef;
  value: BlockItem[] | undefined;
  onChange: (v: BlockItem[]) => void;
  allComponents: ComponentMeta[];
  allGroups: ComponentGroup[];
  spaceId: string;
  onOpenDiscussion?: (fieldKey: string, rect: DOMRect) => void;
  discussionCount?: number;
  isActiveDiscussion?: boolean;
}

// ── BloksField ────────────────────────────────────────────────────────────────

export function BloksField({
  fieldKey,
  def,
  value,
  onChange,
  allComponents,
  allGroups,
  spaceId,
  onOpenDiscussion,
  discussionCount,
  isActiveDiscussion,
}: Props) {
  const blocks = value ?? [];
  const [panelOpen, setPanelOpen] = useState(false);
  const [insertAt, setInsertAt] = useState(0);

  let allowedComponents = allComponents;
  if (def.restrict_components && def.component_whitelist && def.component_whitelist.length > 0) {
    allowedComponents = allComponents.filter((c) => def.component_whitelist!.includes(c.name));
  }
  if (def.component_denylist && def.component_denylist.length > 0) {
    allowedComponents = allowedComponents.filter((c) => !def.component_denylist!.includes(c.name));
  }
  if (def.component_group_whitelist && def.component_group_whitelist.length > 0) {
    allowedComponents = allowedComponents.filter(
      (c) =>
        c.component_group_uuid && def.component_group_whitelist!.includes(c.component_group_uuid),
    );
  }
  if (def.component_group_denylist && def.component_group_denylist.length > 0) {
    allowedComponents = allowedComponents.filter(
      (c) =>
        !c.component_group_uuid || !def.component_group_denylist!.includes(c.component_group_uuid),
    );
  }
  if (def.component_tag_whitelist && def.component_tag_whitelist.length > 0) {
    const wl = def.component_tag_whitelist.map(String);
    allowedComponents = allowedComponents.filter((c) =>
      (c.internal_tags_list ?? []).some((t) => wl.includes(String(t.id))),
    );
  }
  if (def.component_tag_denylist && def.component_tag_denylist.length > 0) {
    const dl = def.component_tag_denylist.map(String);
    allowedComponents = allowedComponents.filter(
      (c) => !(c.internal_tags_list ?? []).some((t) => dl.includes(String(t.id))),
    );
  }

  function addBlock(componentName: string) {
    const newBlock: BlockItem = { _uid: uuidv4(), component: componentName };
    const meta = allComponents.find((c) => c.name === componentName);
    if (meta?.schema) {
      Object.entries(meta.schema).forEach(([key, fieldDef]: [string, any]) => {
        if (fieldDef.default_value !== undefined) newBlock[key] = fieldDef.default_value;
      });
    }
    const next = [...blocks];
    next.splice(insertAt, 0, newBlock);
    onChange(next);
  }

  function openPanelAt(index: number) {
    setInsertAt(index);
    setPanelOpen(true);
  }

  function updateBlock(index: number, updated: BlockItem) {
    const next = [...blocks];
    next[index] = updated;
    onChange(next);
  }

  function removeBlock(index: number) {
    onChange(blocks.filter((_, i) => i !== index));
  }

  function duplicateBlock(index: number) {
    const copy: BlockItem = { ...blocks[index], _uid: uuidv4() };
    const next = [...blocks];
    next.splice(index + 1, 0, copy);
    onChange(next);
  }

  const atMax = def.maximum !== undefined && blocks.length >= def.maximum;
  const belowMin = def.minimum !== undefined && blocks.length < def.minimum;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {def.display_name || fieldKey}
          {def.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="flex items-center gap-1.5">
          {onOpenDiscussion && (
            <button
              type="button"
              onClick={(e) =>
                onOpenDiscussion(fieldKey, (e.currentTarget as HTMLElement).getBoundingClientRect())
              }
              title="Start a discussion"
              className={`group-hover:opacity-100 flex items-center gap-1 p-0.5 rounded transition-all ${
                isActiveDiscussion
                  ? 'opacity-100 text-teal-600 dark:text-teal-400'
                  : 'text-gray-400 opacity-0 hover:text-teal-600 dark:hover:text-teal-400'
              }`}
            >
              {discussionCount != null && discussionCount > 0 && (
                <span className="text-[10px] font-bold text-red-500">{discussionCount}</span>
              )}
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          )}
          <span
            className={`text-xs ${belowMin ? 'text-red-500' : 'text-gray-400'}`}
            title={belowMin ? `Minimum ${def.minimum} required` : undefined}
          >
            {blocks.length}
            {def.maximum ? ` / ${def.maximum}` : ''} block{blocks.length !== 1 ? 's' : ''}
            {belowMin ? ` (min ${def.minimum})` : ''}
          </span>
        </div>
      </div>
      {def.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{def.description}</p>
      )}

      {blocks.length > 0 ? (
        <SortableList
          items={blocks}
          getKey={(block) => block._uid}
          onReorder={onChange}
          className="border border-gray-200 dark:border-gray-700 rounded-lg"
          renderItem={(block, i) => (
            <SortableItem key={block._uid} id={block._uid} draggingClassName="opacity-40 shadow-lg">
              <BlockRow
                block={block}
                allComponents={allComponents}
                allGroups={allGroups}
                spaceId={spaceId}
                onUpdate={(updated) => updateBlock(i, updated)}
                onRemove={() => removeBlock(i)}
                onDuplicate={() => duplicateBlock(i)}
              />
              {!atMax && <AddBlockDivider onAdd={() => openPanelAt(i + 1)} />}
            </SortableItem>
          )}
        />
      ) : (
        !atMax && <AddBlockDivider onAdd={() => openPanelAt(0)} empty />
      )}

      <InsertBlockPanel
        open={panelOpen}
        allowedComponents={allowedComponents}
        allGroups={allGroups}
        onAdd={addBlock}
        onClose={() => setPanelOpen(false)}
      />
    </div>
  );
}
