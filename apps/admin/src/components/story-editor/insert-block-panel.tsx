'use client';

import { useState, useMemo } from 'react';
import { X, ChevronDown, ChevronRight, Folder, Search } from 'lucide-react';
import type { ComponentMeta, ComponentGroup } from './types';

interface Props {
  open: boolean;
  allowedComponents: ComponentMeta[];
  allGroups: ComponentGroup[];
  onAdd: (componentName: string) => void;
  onClose: () => void;
}

function initials(name: string): string {
  return name
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function ComponentIcon({ component }: { component: ComponentMeta }) {
  const bg = component.color ?? '#94a3b8';
  const label = initials(component.display_name || component.name);
  return (
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
      style={{ backgroundColor: bg }}
    >
      {label}
    </div>
  );
}

interface FolderSectionProps {
  groupName: string;
  components: ComponentMeta[];
  onAdd: (name: string) => void;
  forceOpen?: boolean;
}

function FolderSection({ groupName, components, onAdd, forceOpen }: FolderSectionProps) {
  const [open, setOpen] = useState(true);

  const isOpen = forceOpen !== undefined ? forceOpen : open;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <Folder className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
        <span className="flex-1 text-left">{groupName}</span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div className="pb-2">
          {components.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => onAdd(c.name)}
              className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
            >
              <ComponentIcon component={c} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {c.display_name || c.name}
                </div>
                {c.description && (
                  <div className="text-xs text-gray-400 truncate mt-0.5">{c.description}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function InsertBlockPanel({ open, allowedComponents, allGroups, onAdd, onClose }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return allowedComponents;
    const q = search.toLowerCase();
    return allowedComponents.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.display_name ?? '').toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q),
    );
  }, [allowedComponents, search]);

  // Group components
  const grouped = useMemo(() => {
    const groupMap = new Map<string, { name: string; components: ComponentMeta[] }>();

    // Build group name lookup
    const groupNames = new Map(allGroups.map((g) => [g.uuid, g.name]));

    for (const c of filtered) {
      const key = c.component_group_uuid ?? '__ungrouped';
      const name = c.component_group_uuid
        ? (groupNames.get(c.component_group_uuid) ?? c.component_group_uuid)
        : 'Other';
      if (!groupMap.has(key)) groupMap.set(key, { name, components: [] });
      groupMap.get(key)!.components.push(c);
    }

    // Sort groups alphabetically
    return Array.from(groupMap.entries())
      .sort(([, a], [, b]) => a.name.localeCompare(b.name))
      .map(([, v]) => v);
  }, [filtered, allGroups]);

  if (!open) return null;

  const isSearching = search.trim().length > 0;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-[420px] bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Insert block</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Filter ${allowedComponents.length} component blocks`}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              No blocks found
            </div>
          )}

          {grouped.map((group) => (
            <FolderSection
              key={group.name}
              groupName={group.name}
              components={group.components}
              onAdd={(name) => {
                onAdd(name);
                onClose();
              }}
              forceOpen={isSearching ? true : undefined}
            />
          ))}
        </div>
      </div>
    </>
  );
}
