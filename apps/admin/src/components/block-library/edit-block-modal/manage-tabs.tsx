'use client';

import { Trash2, Plus } from 'lucide-react';
import { SortableList, SortableItem, SortableDragHandle } from '@/components/ui/sortable-list';
import type { WorkingTab } from './types';
import { DEFAULT_TAB_KEY } from './types';

interface ManageTabsProps {
  tabs: WorkingTab[];
  onTabsChange: (tabs: WorkingTab[]) => void;
  onBack: () => void;
}

export function ManageTabs({ tabs, onTabsChange, onBack }: ManageTabsProps) {
  function handleRename(key: string, name: string) {
    onTabsChange(tabs.map((t) => (t.key === key ? { ...t, name } : t)));
  }

  function handleDelete(key: string) {
    onTabsChange(tabs.filter((t) => t.key !== key));
  }

  function handleAddTab() {
    const key = `__tab_${Date.now()}`;
    onTabsChange([...tabs, { key, name: 'New tab' }]);
  }

  // Split: default tab is always first and not sortable
  const defaultTab = tabs.find((t) => t.key === DEFAULT_TAB_KEY);
  const sortableTabs = tabs.filter((t) => t.key !== DEFAULT_TAB_KEY);

  function handleReorder(reordered: WorkingTab[]) {
    onTabsChange(defaultTab ? [defaultTab, ...reordered] : reordered);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-2">
        {/* Default tab — not draggable */}
        {defaultTab && (
          <div className="flex items-center gap-2">
            <div className="text-gray-300 opacity-30 cursor-not-allowed shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="12" r="1" />
                <circle cx="9" cy="5" r="1" />
                <circle cx="9" cy="19" r="1" />
                <circle cx="15" cy="12" r="1" />
                <circle cx="15" cy="5" r="1" />
                <circle cx="15" cy="19" r="1" />
              </svg>
            </div>
            <input
              type="text"
              value={defaultTab.name}
              disabled
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed"
            />
            <button
              disabled
              className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Sortable tabs */}
        <SortableList
          items={sortableTabs}
          getKey={(tab) => tab.key}
          onReorder={handleReorder}
          renderItem={(tab) => (
            <SortableItem key={tab.key} id={tab.key} className="mb-2">
              <div className="flex items-center gap-2">
                <SortableDragHandle />
                <input
                  type="text"
                  value={tab.name}
                  onChange={(e) => handleRename(tab.key, e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                />
                <button
                  onClick={() => handleDelete(tab.key)}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </SortableItem>
          )}
        />

        <button
          onClick={handleAddTab}
          className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400 font-medium mt-2"
        >
          <Plus className="w-4 h-4" />
          New tab
        </button>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 px-8 py-6 flex justify-end">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
        >
          Save &amp; Back to Fields
        </button>
      </div>
    </div>
  );
}
