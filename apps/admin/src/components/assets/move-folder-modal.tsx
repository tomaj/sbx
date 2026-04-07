'use client';

import { useState } from 'react';
import { Search, Home, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import type { AssetFolder } from './folder-tree';

interface MoveFolderModalProps {
  open: boolean;
  count: number;
  folders: AssetFolder[];
  /** Currently selected folder id — exclude from the tree when moving a folder */
  excludeId?: number;
  onConfirm: (folderId: number | null) => void;
  onCancel: () => void;
}

type FolderNode = AssetFolder & { children: FolderNode[] };

function buildTree(folders: AssetFolder[], excludeId?: number): FolderNode[] {
  const filtered = excludeId != null ? folders.filter((f) => f.id !== excludeId) : folders;
  const map = new Map<number, FolderNode>();
  for (const f of filtered) map.set(f.id, { ...f, children: [] });
  const roots: FolderNode[] = [];
  for (const node of map.values()) {
    if (node.parent_id !== null && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  function sort(nodes: FolderNode[]) {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const n of nodes) sort(n.children);
  }
  sort(roots);
  return roots;
}

interface FolderRowProps {
  node: FolderNode;
  depth: number;
  selectedId: number | null | undefined;
  onSelect: (id: number | null) => void;
}

function FolderRow({ node, depth, selectedId, onSelect }: FolderRowProps) {
  const [expanded, setExpanded] = useState(false);
  const isSelected = selectedId === node.id;
  const hasChildren = node.children.length > 0;

  return (
    <>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer select-none transition-colors ${
          isSelected
            ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300'
            : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={() => onSelect(node.id)}
      >
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
        {isSelected || expanded ? (
          <FolderOpen className="w-4 h-4 shrink-0 text-teal-500" />
        ) : (
          <Folder className="w-4 h-4 shrink-0 text-teal-400" />
        )}
        <span className="text-sm">{node.name}</span>
      </div>
      {expanded &&
        node.children.map((child) => (
          <FolderRow
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
    </>
  );
}

export function MoveFolderModal({
  open,
  count,
  folders,
  excludeId,
  onConfirm,
  onCancel,
}: MoveFolderModalProps) {
  const [search, setSearch] = useState('');
  // undefined = nothing selected yet, null = Root, number = folder id
  const [selectedId, setSelectedId] = useState<number | null | undefined>(undefined);

  if (!open) return null;

  const tree = buildTree(folders, excludeId);

  const searchLower = search.trim().toLowerCase();
  const flatFiltered = searchLower
    ? folders.filter((f) => f.id !== excludeId && f.name.toLowerCase().includes(searchLower))
    : null;

  const canMove = selectedId !== undefined;

  function handleConfirm() {
    if (!canMove) return;
    onConfirm(selectedId ?? null);
    setSelectedId(undefined);
    setSearch('');
  }

  function handleCancel() {
    setSelectedId(undefined);
    setSearch('');
    onCancel();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      onClick={handleCancel}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col overflow-hidden"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Move {count} {count === 1 ? 'item' : 'items'} to...
            </h2>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search folders..."
              className="w-full pl-11 pr-4 py-3 text-base border-2 border-teal-500 rounded-xl bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Folder list */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {/* Root option */}
          {!searchLower && (
            <div
              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer select-none transition-colors ${
                selectedId === null
                  ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300'
                  : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              onClick={() => setSelectedId(null)}
            >
              <Home className="w-4 h-4 shrink-0 text-gray-400" />
              <span className="text-sm font-medium">Root</span>
            </div>
          )}

          {/* Tree or flat search results */}
          {flatFiltered
            ? flatFiltered.map((f) => (
                <div
                  key={f.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer select-none transition-colors ${
                    selectedId === f.id
                      ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300'
                      : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => setSelectedId(f.id)}
                >
                  <Folder className="w-4 h-4 shrink-0 text-teal-400" />
                  <span className="text-sm">{f.name}</span>
                </div>
              ))
            : tree.map((node) => (
                <FolderRow
                  key={node.id}
                  node={node}
                  depth={0}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleCancel}
            className="px-6 py-2.5 text-sm font-medium border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canMove}
            className="px-6 py-2.5 text-sm font-medium rounded-xl bg-gray-700 dark:bg-gray-600 text-white hover:bg-gray-800 dark:hover:bg-gray-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Move
          </button>
        </div>
      </div>
    </div>
  );
}
