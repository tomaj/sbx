'use client'

import { useState, useRef, useEffect } from 'react'
import { Folder, FolderOpen, ChevronRight, ChevronDown, LayoutTemplate, MoreHorizontal, Plus, Pencil, Trash2 } from 'lucide-react'

export interface ComponentGroup {
  id: number
  uuid: string
  name: string
  parent_id: number | null
  parent_uuid: string | null
}

interface GroupNode extends ComponentGroup {
  children: GroupNode[]
}

function buildTree(groups: ComponentGroup[]): GroupNode[] {
  const map = new Map<number, GroupNode>()
  for (const g of groups) map.set(g.id, { ...g, children: [] })
  const roots: GroupNode[] = []
  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  function sortChildren(nodes: GroupNode[]) {
    nodes.sort((a, b) => a.name.localeCompare(b.name))
    nodes.forEach((n) => sortChildren(n.children))
  }
  sortChildren(roots)
  return roots
}

interface GroupRowProps {
  node: GroupNode
  depth: number
  selectedUuid: string | null
  onSelect: (uuid: string | null) => void
  onCreateSubgroup: (parentUuid: string) => void
  onRename: (group: ComponentGroup) => void
  onDelete: (group: ComponentGroup) => void
  counts?: Record<string, number>
}

function GroupRow({ node, depth, selectedUuid, onSelect, onCreateSubgroup, onRename, onDelete, counts }: GroupRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const isSelected = selectedUuid === node.uuid
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
        onClick={() => onSelect(node.uuid)}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }}
          className="w-4 h-4 flex items-center justify-center shrink-0 text-gray-400"
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
          ) : null}
        </button>

        {isSelected || expanded
          ? <FolderOpen className="w-4 h-4 shrink-0 text-teal-500" />
          : <Folder className="w-4 h-4 shrink-0 text-gray-400" />}

        <span className="text-sm truncate flex-1">{node.name}</span>

        {counts && counts[node.uuid] !== undefined && (
          <span className="text-xs text-gray-400 mr-1">{counts[node.uuid]}</span>
        )}

        <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-0.5 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 w-44">
              <button
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                onClick={() => { setMenuOpen(false); onCreateSubgroup(node.uuid) }}
              >
                <Plus className="w-3.5 h-3.5" /> Create subgroup
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                onClick={() => { setMenuOpen(false); onRename(node) }}
              >
                <Pencil className="w-3.5 h-3.5" /> Rename
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

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <GroupRow
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedUuid={selectedUuid}
              onSelect={onSelect}
              onCreateSubgroup={onCreateSubgroup}
              onRename={onRename}
              onDelete={onDelete}
              counts={counts}
            />
          ))}
        </div>
      )}
    </>
  )
}

interface GroupTreeProps {
  groups: ComponentGroup[]
  selectedUuid: string | null
  onSelect: (uuid: string | null) => void
  search: string
  counts?: { total: number; by_group: Record<string, number> }
  onCreateGroup: (parentUuid?: string) => void
  onRenameGroup: (group: ComponentGroup) => void
  onDeleteGroup: (group: ComponentGroup) => void
}

export function GroupTree({
  groups,
  selectedUuid,
  onSelect,
  search,
  counts,
  onCreateGroup,
  onRenameGroup,
  onDeleteGroup,
}: GroupTreeProps) {
  const filtered = search.trim()
    ? groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
    : groups

  const tree = search.trim() ? null : buildTree(filtered)

  return (
    <div className="flex flex-col gap-0.5">
      {/* All blocks */}
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer select-none ${
          selectedUuid === null
            ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        onClick={() => onSelect(null)}
      >
        <LayoutTemplate className="w-4 h-4 shrink-0 text-gray-400" />
        <span className="text-sm font-medium flex-1">All blocks</span>
        {counts && (
          <span className="text-xs text-gray-400">{counts.total}</span>
        )}
      </div>

      {tree
        ? tree.map((node) => (
            <GroupRow
              key={node.id}
              node={node}
              depth={0}
              selectedUuid={selectedUuid}
              onSelect={onSelect}
              onCreateSubgroup={(uuid) => onCreateGroup(uuid)}
              onRename={onRenameGroup}
              onDelete={onDeleteGroup}
              counts={counts?.by_group}
            />
          ))
        : filtered.map((g) => (
            <div
              key={g.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer select-none ${
                selectedUuid === g.uuid
                  ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              onClick={() => onSelect(g.uuid)}
            >
              <Folder className="w-4 h-4 shrink-0 text-gray-400" />
              <span className="text-sm truncate flex-1">{g.name}</span>
              {counts?.by_group[g.uuid] !== undefined && (
                <span className="text-xs text-gray-400">{counts.by_group[g.uuid]}</span>
              )}
            </div>
          ))}
    </div>
  )
}
