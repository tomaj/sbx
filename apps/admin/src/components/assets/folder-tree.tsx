'use client';

import { Home, Plus, Pencil, Move, Trash2 } from 'lucide-react';
import { TreeNav, type TreeNavItem, type TreeNavAction } from '@/components/ui/tree-nav';

export interface AssetFolder {
  id: number;
  name: string;
  parent_id: number | null;
  uuid: string;
}

type AssetFolderItem = AssetFolder & TreeNavItem;

export interface FolderTreeProps {
  folders: AssetFolder[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  search: string;
  onCreateFolder: (parentId: number | null) => void;
  onRenameFolder: (folder: AssetFolder) => void;
  onMoveFolder: (folder: AssetFolder) => void;
  onDeleteFolder: (folder: AssetFolder) => void;
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
  const items: AssetFolderItem[] = folders.map((f) => ({
    ...f,
    parentId: f.parent_id,
    label: f.name,
  }));

  // Apply external search filter
  const filtered = search.trim()
    ? items.filter((item) => item.label.toLowerCase().includes(search.toLowerCase()))
    : items;

  const actions: TreeNavAction<AssetFolderItem>[] = [
    {
      label: 'Create new folder',
      icon: Plus,
      onClick: (item) => onCreateFolder(item.id as number),
    },
    {
      label: 'Rename',
      icon: Pencil,
      onClick: (item) => onRenameFolder(item as AssetFolder),
    },
    {
      label: 'Move',
      icon: Move,
      onClick: (item) => onMoveFolder(item as AssetFolder),
    },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: (item) => onDeleteFolder(item as AssetFolder),
      variant: 'danger',
    },
  ];

  return (
    <TreeNav<AssetFolderItem>
      items={filtered}
      selectedId={selectedId}
      onSelect={(id) => onSelect(id as number | null)}
      actions={actions}
      pinnedItems={[
        {
          id: 'root',
          label: 'Root',
          icon: Home,
          selected: selectedId === null,
          onClick: () => onSelect(null),
        },
      ]}
    />
  );
}
