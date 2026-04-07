'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Search,
} from 'lucide-react';

// TreeNavItem — the data shape (generic constraint)
export interface TreeNavItem {
  id: string | number;
  parentId: string | number | null;
  label: string;
  count?: number; // optional badge number shown after label
}

// Actions available on each item in the context menu
export interface TreeNavAction<T extends TreeNavItem> {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: (item: T) => void;
  variant?: 'default' | 'danger';
}

// Pinned items — fixed items shown BEFORE the tree (like "Root", "All blocks", "Tags")
export interface TreeNavPinnedItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  selected: boolean;
  onClick: () => void;
}

export interface TreeNavProps<T extends TreeNavItem> {
  items: T[];
  // Selection: either a single item is selected (by id) or null
  selectedId: string | number | null;
  onSelect: (id: string | number | null) => void;
  // Context menu actions per item
  actions: TreeNavAction<T>[];
  // Fixed items pinned at the top before the tree
  pinnedItems?: TreeNavPinnedItem[];
  // Whether to show an internal search box (default: false)
  searchable?: boolean;
  // Optional section label above the tree items
  sectionLabel?: string;
  // Class on container
  className?: string;
}

type TreeNode<T extends TreeNavItem> = T & { children: TreeNode<T>[] };

function buildTree<T extends TreeNavItem>(items: T[]): TreeNode<T>[] {
  const map = new Map<string | number, TreeNode<T>>();
  for (const item of items) map.set(item.id, { ...item, children: [] });
  const roots: TreeNode<T>[] = [];
  for (const node of map.values()) {
    if (node.parentId !== null && node.parentId !== undefined && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  function sortChildren(nodes: TreeNode<T>[]) {
    nodes.sort((a, b) => a.label.localeCompare(b.label));
    for (const n of nodes) sortChildren(n.children);
  }
  sortChildren(roots);
  return roots;
}

interface TreeNavRowProps<T extends TreeNavItem> {
  node: TreeNode<T>;
  depth: number;
  selectedId: string | number | null;
  onSelect: (id: string | number | null) => void;
  actions: TreeNavAction<T>[];
}

function TreeNavRow<T extends TreeNavItem>({
  node,
  depth,
  selectedId,
  onSelect,
  actions,
}: TreeNavRowProps<T>) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isSelected = selectedId === node.id;
  const hasChildren = node.children.length > 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <>
      <div
        className={`group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer select-none ${
          isSelected
            ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onSelect(node.id)}
      >
        {/* Expand toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="w-4 h-4 flex items-center justify-center shrink-0 text-gray-400"
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )
          ) : null}
        </button>

        {/* Folder icon */}
        {isSelected || expanded ? (
          <FolderOpen className="w-4 h-4 shrink-0 text-teal-500" />
        ) : (
          <Folder className="w-4 h-4 shrink-0 text-gray-400" />
        )}

        {/* Label */}
        <span className="text-sm truncate flex-1">{node.label}</span>

        {/* Count badge */}
        {node.count !== undefined && (
          <span className="text-xs text-gray-400 mr-1">{node.count}</span>
        )}

        {/* Context menu */}
        {actions.length > 0 && (
          <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-0.5 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 w-44">
                {actions.map((action) => (
                  <button
                    key={action.label}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 ${
                      action.variant === 'danger'
                        ? 'text-red-600'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                    onClick={() => {
                      setMenuOpen(false);
                      action.onClick(node);
                    }}
                  >
                    <action.icon className="w-3.5 h-3.5" />
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNavRow
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              actions={actions}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function TreeNav<T extends TreeNavItem>({
  items,
  selectedId,
  onSelect,
  actions,
  pinnedItems,
  searchable = false,
  sectionLabel,
  className,
}: TreeNavProps<T>) {
  const [search, setSearch] = useState('');

  const filtered =
    searchable && search.trim()
      ? items.filter((item) => item.label.toLowerCase().includes(search.toLowerCase()))
      : items;

  const isSearching = searchable && search.trim().length > 0;
  const tree = isSearching ? null : buildTree(filtered);

  return (
    <div className={`flex flex-col gap-0.5${className ? ` ${className}` : ''}`}>
      {/* Pinned items */}
      {pinnedItems?.map((item) => (
        <div
          key={item.id}
          className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer select-none ${
            item.selected
              ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          onClick={item.onClick}
        >
          <item.icon className="w-4 h-4 shrink-0 text-gray-400" />
          <span className="text-sm font-medium flex-1">{item.label}</span>
          {item.count !== undefined && <span className="text-xs text-gray-400">{item.count}</span>}
        </div>
      ))}

      {/* Section label */}
      {sectionLabel && (
        <p className="px-2 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {sectionLabel}
        </p>
      )}

      {/* Search box */}
      {searchable && (
        <div className="relative mb-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search folders..."
            className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      )}

      {/* Tree or flat search results */}
      {tree
        ? tree.map((node) => (
            <TreeNavRow
              key={node.id}
              node={node}
              depth={0}
              selectedId={selectedId}
              onSelect={onSelect}
              actions={actions}
            />
          ))
        : filtered.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer select-none ${
                selectedId === item.id
                  ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              onClick={() => onSelect(item.id)}
            >
              <Folder className="w-4 h-4 shrink-0 text-gray-400" />
              <span className="text-sm truncate flex-1">{item.label}</span>
              {item.count !== undefined && (
                <span className="text-xs text-gray-400">{item.count}</span>
              )}
            </div>
          ))}
    </div>
  );
}
