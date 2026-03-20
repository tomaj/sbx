'use client'

import { useState, useRef, useEffect } from 'react'
import { Folder, FolderOpen, ChevronRight, ChevronDown, Home, MoreHorizontal, Plus, Pencil, Move, Trash2 } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/confirm-modal'

export interface AssetFolder {
  id: number
  name: string
  parent_id: number | null
  uuid: string
}

interface FolderNode extends AssetFolder {
  children: FolderNode[]
}

function buildTree(folders: AssetFolder[]): FolderNode[] {
  const map = new Map<number, FolderNode>()
  for (const f of folders) map.set(f.id, { ...f, children: [] })
  const roots: FolderNode[] = []
  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  // Sort children alphabetically
  function sortChildren(nodes: FolderNode[]) {
    nodes.sort((a, b) => a.name.localeCompare(b.name))
    nodes.forEach(n => sortChildren(n.children))
  }
  sortChildren(roots)
  return roots
}

interface FolderRowProps {
  node: FolderNode
  depth: number
  selectedId: number | null
  onSelect: (id: number | null) => void
  onCreateSubfolder: (parentId: number) => void
  onRename: (folder: AssetFolder) => void
  onMove: (folder: AssetFolder) => void
  onDelete: (folder: AssetFolder) => void
}

function FolderRow({
  node,
  depth,
  selectedId,
  onSelect,
  onCreateSubfolder,
  onRename,
  onMove,
  onDelete,
}: FolderRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const isSelected = selectedId === node.id
  const hasChildren = node.children.length > 0

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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
          onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
          className="w-4 h-4 flex items-center justify-center shrink-0 text-gray-400"
        >
          {hasChildren
            ? expanded
              ? <ChevronDown className="w-3 h-3" />
              : <ChevronRight className="w-3 h-3" />
            : null}
        </button>

        {/* Folder icon */}
        {isSelected || expanded
          ? <FolderOpen className="w-4 h-4 shrink-0 text-teal-500" />
          : <Folder className="w-4 h-4 shrink-0 text-gray-400" />}

        {/* Name */}
        <span className="text-sm truncate flex-1">{node.name}</span>

        {/* Context menu */}
        <div className="relative" ref={menuRef} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-0.5 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 w-44">
              <button
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                onClick={() => { setMenuOpen(false); onCreateSubfolder(node.id) }}
              >
                <Plus className="w-3.5 h-3.5" /> Create new folder
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                onClick={() => { setMenuOpen(false); onRename(node) }}
              >
                <Pencil className="w-3.5 h-3.5" /> Rename
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                onClick={() => { setMenuOpen(false); onMove(node) }}
              >
                <Move className="w-3.5 h-3.5" /> Move
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                onClick={() => { setMenuOpen(false); onDelete(node) }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <FolderRow
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onCreateSubfolder={onCreateSubfolder}
              onRename={onRename}
              onMove={onMove}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </>
  )
}

interface FolderTreeProps {
  folders: AssetFolder[]
  selectedId: number | null
  onSelect: (id: number | null) => void
  search: string
  onCreateFolder: (parentId: number | null) => void
  onRenameFolder: (folder: AssetFolder) => void
  onMoveFolder: (folder: AssetFolder) => void
  onDeleteFolder: (folder: AssetFolder) => void
}

export function FolderTree({
  folders,
  selectedId,
  onSelect,
  search,
  onCreateFolder,
  onRenameFolder,
  onMoveFolder,
  onDeleteFolder,
}: FolderTreeProps) {
  // Filter folders by search
  const filtered = search.trim()
    ? folders.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    : folders

  // Build tree only when not searching (flat list when searching)
  const tree = search.trim() ? null : buildTree(filtered)

  return (
    <div className="flex flex-col gap-0.5">
      {/* Root option */}
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer select-none ${
          selectedId === null
            ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        onClick={() => onSelect(null)}
      >
        <Home className="w-4 h-4 shrink-0 text-gray-400" />
        <span className="text-sm font-medium">Root</span>
      </div>

      {/* Folder list */}
      {tree
        ? tree.map(node => (
            <FolderRow
              key={node.id}
              node={node}
              depth={0}
              selectedId={selectedId}
              onSelect={onSelect}
              onCreateSubfolder={onCreateFolder}
              onRename={onRenameFolder}
              onMove={onMoveFolder}
              onDelete={onDeleteFolder}
            />
          ))
        : filtered.map(f => (
            <div
              key={f.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer select-none ${
                selectedId === f.id
                  ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              onClick={() => onSelect(f.id)}
            >
              <Folder className="w-4 h-4 shrink-0 text-gray-400" />
              <span className="text-sm truncate">{f.name}</span>
            </div>
          ))}
    </div>
  )
}
