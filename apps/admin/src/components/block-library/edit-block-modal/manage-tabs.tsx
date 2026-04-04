'use client';

import { useRef } from 'react';
import { GripVertical, Trash2, Plus } from 'lucide-react';
import type { WorkingTab } from './types';
import { DEFAULT_TAB_KEY } from './types';

interface ManageTabsProps {
  tabs: WorkingTab[];
  onTabsChange: (tabs: WorkingTab[]) => void;
  onBack: () => void;
}

export function ManageTabs({ tabs, onTabsChange, onBack }: ManageTabsProps) {
  const dragKey = useRef<string | null>(null);
  const dragOverKey = useRef<string | null>(null);

  function handleDragStart(key: string) {
    dragKey.current = key;
  }

  function handleDragOver(e: React.DragEvent, key: string) {
    e.preventDefault();
    dragOverKey.current = key;
  }

  function handleDrop() {
    const from = dragKey.current;
    const to = dragOverKey.current;
    if (!from || !to || from === to) return;

    const next = [...tabs];
    const fromIdx = next.findIndex((t) => t.key === from);
    const toIdx = next.findIndex((t) => t.key === to);
    if (fromIdx === -1 || toIdx === -1) return;

    // Don't allow reordering the General tab
    if (from === DEFAULT_TAB_KEY || to === DEFAULT_TAB_KEY) return;

    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onTabsChange(next);
    dragKey.current = null;
    dragOverKey.current = null;
  }

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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-2">
        {tabs.map((tab) => (
          <div
            key={tab.key}
            draggable={tab.key !== DEFAULT_TAB_KEY}
            onDragStart={() => handleDragStart(tab.key)}
            onDragOver={(e) => handleDragOver(e, tab.key)}
            onDrop={handleDrop}
            className="flex items-center gap-2"
          >
            <div
              className={`text-gray-300 cursor-grab ${tab.key === DEFAULT_TAB_KEY ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              <GripVertical className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={tab.name}
              disabled={tab.key === DEFAULT_TAB_KEY}
              onChange={(e) => handleRename(tab.key, e.target.value)}
              className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                tab.key === DEFAULT_TAB_KEY
                  ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100'
              }`}
            />
            <button
              onClick={() => handleDelete(tab.key)}
              disabled={tab.key === DEFAULT_TAB_KEY}
              className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

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
