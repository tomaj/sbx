'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronDown, Folder, FolderOpen, Home } from 'lucide-react';
import type { AssetFolder } from './folder-tree';

// ─── Tree helpers ────────────────────────────────────────────────────────────

interface FolderNode extends AssetFolder {
  children: FolderNode[];
}

function buildTree(folders: AssetFolder[]): FolderNode[] {
  const map = new Map<number, FolderNode>();
  for (const f of folders) map.set(f.id, { ...f, children: [] });
  const roots: FolderNode[] = [];
  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  function sort(nodes: FolderNode[]) {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((n) => sort(n.children));
  }
  sort(roots);
  return roots;
}

/** Returns the set of ancestor IDs for a given folder ID (so we can pre-expand the path). */
function getAncestorIds(folders: AssetFolder[], targetId: number | null): Set<number> {
  if (targetId === null) return new Set();
  const parentMap = new Map<number, number | null>();
  for (const f of folders) parentMap.set(f.id, f.parent_id);
  const ancestors = new Set<number>();
  let current: number | null = targetId;
  while (current !== null) {
    const parent: number | null = parentMap.get(current) ?? null;
    if (parent !== null) ancestors.add(parent);
    current = parent;
  }
  return ancestors;
}

// ─── Tree node component ─────────────────────────────────────────────────────

interface TreeNodeProps {
  node: FolderNode;
  depth: number;
  selectedId: number | null;
  expanded: Set<number>;
  onSelect: (id: number | null) => void;
  onToggle: (id: number) => void;
}

function TreeNode({ node, depth, selectedId, expanded, onSelect, onToggle }: TreeNodeProps) {
  const isSelected = selectedId === node.id;
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        className={`w-full flex items-center gap-1.5 px-2 py-2 text-sm text-left rounded-md transition-colors ${
          isSelected
            ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-medium'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* Expand toggle */}
        <span
          className="w-4 h-4 flex items-center justify-center shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(node.id);
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            )
          ) : (
            <span className="w-3.5 h-3.5" />
          )}
        </span>

        {/* Folder icon */}
        {isSelected || isExpanded ? (
          <FolderOpen className="w-4 h-4 shrink-0 text-teal-500" />
        ) : (
          <Folder className="w-4 h-4 shrink-0 text-gray-400" />
        )}

        <span className="truncate">{node.name}</span>
      </button>

      {isExpanded &&
        hasChildren &&
        node.children.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedId={selectedId}
            expanded={expanded}
            onSelect={onSelect}
            onToggle={onToggle}
          />
        ))}
    </>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

interface CreateFolderModalProps {
  open: boolean;
  folders: AssetFolder[];
  defaultParentId?: number | null;
  onConfirm: (name: string, parentId: number | null) => Promise<void>;
  onCancel: () => void;
}

export function CreateFolderModal({
  open,
  folders,
  defaultParentId = null,
  onConfirm,
  onCancel,
}: CreateFolderModalProps) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<number | null>(defaultParentId ?? null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens, pre-expand path to defaultParentId
  useEffect(() => {
    if (open) {
      setName('');
      setParentId(defaultParentId ?? null);
      setError(null);
      setSaving(false);
      // Pre-expand all ancestors so the selected folder is visible
      const ancestors = getAncestorIds(folders, defaultParentId ?? null);
      if (defaultParentId !== null) ancestors.add(defaultParentId);
      setExpanded(ancestors);
    }
  }, [open, defaultParentId, folders]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const tree = buildTree(folders);

  function toggleExpanded(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError('Folder name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onConfirm(name.trim(), parentId);
    } catch (e: any) {
      setError(e.message ?? 'Failed to create folder');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Create New Folder
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 flex flex-col gap-4 overflow-y-auto flex-1">
          {/* Name input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
              placeholder="e.g. Icons, Videos, Landing pages"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 placeholder-gray-400"
            />
          </div>

          {/* Parent folder tree */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Parent folder
            </label>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-y-auto max-h-64 p-1">
              {/* Root */}
              <button
                type="button"
                onClick={() => setParentId(null)}
                className={`w-full flex items-center gap-2 px-2 py-2 text-sm text-left rounded-md transition-colors ${
                  parentId === null
                    ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className="w-4 h-4 shrink-0" />
                <Home
                  className={`w-4 h-4 shrink-0 ${parentId === null ? 'text-teal-500' : 'text-gray-400'}`}
                />
                Root
              </button>

              {/* Tree */}
              {tree.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  selectedId={parentId}
                  expanded={expanded}
                  onSelect={setParentId}
                  onToggle={toggleExpanded}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
