'use client';

import { useState } from 'react';
import { parseSchema } from '@/components/block-library/edit-block-modal/types';
import { FieldRenderer } from './field-renderer';
import type { ComponentMeta, ComponentGroup } from './types';

interface Props {
  spaceId: string;
  schema: Record<string, any> | null;
  content: Record<string, any>;
  allComponents: ComponentMeta[];
  allGroups: ComponentGroup[];
  onChange: (key: string, value: any) => void;
  loading?: boolean;
  onOpenDiscussion?: (fieldKey: string, rect: DOMRect) => void;
  discussionCounts?: Record<string, number>;
  activeDiscussionField?: string | null;
}

export function EditTab({
  spaceId,
  schema,
  content,
  allComponents,
  allGroups,
  onChange,
  loading,
  onOpenDiscussion,
  discussionCounts,
  activeDiscussionField,
}: Props) {
  const [activeTab, setActiveTab] = useState(0);

  const componentName = content?.component as string | undefined;
  const componentMeta = allComponents.find((c) => c.name === componentName);
  const componentDisplayName = componentMeta?.display_name || componentName;

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        {/* Skeleton component name */}
        <div className="px-5 pt-5 pb-1 flex-shrink-0">
          <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        {/* Skeleton tab bar */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 px-5 py-2 flex-shrink-0">
          {[48, 72, 80].map((w, i) => (
            <div
              key={i}
              className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
              style={{ width: w }}
            />
          ))}
        </div>
        {/* Skeleton fields */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {[75, 55, 100, 60, 80, 45].map((w, i) => (
            <div key={i} className="space-y-2">
              <div
                className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                style={{ width: `${w}%` }}
              />
              <div className="h-10 w-full bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!schema || Object.keys(schema).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-400">
        <p className="text-sm">No schema defined for this content type</p>
      </div>
    );
  }

  const { tabs, fields } = parseSchema(schema);
  const visibleTabs = tabs.filter((t) => fields.some((f) => f.tabKey === t.key));

  const currentTab = visibleTabs[activeTab] ?? visibleTabs[0];
  const tabFields = fields.filter((f) => f.tabKey === currentTab?.key);

  return (
    <div className="flex flex-col h-full">
      {/* Component name header */}
      {componentDisplayName && (
        <div className="px-4 pt-4 pb-1 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {componentDisplayName}
          </h2>
        </div>
      )}

      {/* Tab bar */}
      {visibleTabs.length > 1 && (
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-4 flex-shrink-0">
          {visibleTabs.map((tab, i) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(i)}
              className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                i === activeTab
                  ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      )}

      {/* Fields */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        {tabFields.length === 0 && <p className="text-sm text-gray-400">No fields in this tab</p>}
        {tabFields.map((field) => (
          <FieldRenderer
            key={field.key}
            fieldKey={field.key}
            def={field.def}
            value={content[field.key]}
            onChange={(v) => onChange(field.key, v)}
            allComponents={allComponents}
            allGroups={allGroups}
            spaceId={spaceId}
            onOpenDiscussion={onOpenDiscussion}
            discussionCount={discussionCounts?.[field.key]}
            isActiveDiscussion={activeDiscussionField === field.key}
          />
        ))}
      </div>
    </div>
  );
}
