'use client';

import { Images, Trash2, Search, Tag } from 'lucide-react';
import { FolderTree, type AssetFolder } from '@/components/assets/folder-tree';

export interface AssetsSidebarProps {
  isTagsView: boolean;
  showDeleted: boolean;
  selectedFolder: number | null | undefined;
  totalCount: number;
  deletedCount: number;
  assetTagsCount: number;
  folders: AssetFolder[];
  folderSearch: string;
  onFolderSearchChange: (value: string) => void;
  onSelectAllAssets: () => void;
  onSelectTags: () => void;
  onSelectDeleted: () => void;
  onSelectFolder: (id: number | null | undefined) => void;
  onCreateFolder: (parentId: number | null) => void;
  onRenameFolder: (folder: AssetFolder) => void;
  onMoveFolder: (folder: AssetFolder) => void;
  onDeleteFolder: (folder: AssetFolder) => void;
}

export function AssetsSidebar({
  isTagsView,
  showDeleted,
  selectedFolder,
  totalCount,
  deletedCount,
  assetTagsCount,
  folders,
  folderSearch,
  onFolderSearchChange,
  onSelectAllAssets,
  onSelectTags,
  onSelectDeleted,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onMoveFolder,
  onDeleteFolder,
}: AssetsSidebarProps) {
  return (
    <>
      {/* All Assets */}
      <button
        type="button"
        onClick={onSelectAllAssets}
        className={`flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors ${
          !isTagsView && !showDeleted && selectedFolder === undefined
            ? 'text-teal-700 dark:text-teal-300 font-medium'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        <span className="flex items-center gap-2">
          <Images className="w-4 h-4 text-gray-400" />
          All Assets
        </span>
        <span className="text-xs text-gray-400">{totalCount}</span>
      </button>

      {/* Tags */}
      <button
        type="button"
        onClick={onSelectTags}
        className={`flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors ${
          isTagsView
            ? 'text-teal-700 dark:text-teal-300 font-medium'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        <span className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-gray-400" />
          Tags
        </span>
        {assetTagsCount > 0 && <span className="text-xs text-gray-400">{assetTagsCount}</span>}
      </button>

      {/* Deleted assets */}
      <button
        type="button"
        onClick={onSelectDeleted}
        className={`flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors ${
          !isTagsView && showDeleted
            ? 'text-teal-700 dark:text-teal-300 font-medium'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        <span className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-gray-400" />
          Deleted assets
        </span>
        {deletedCount > 0 && <span className="text-xs text-gray-400">{deletedCount}</span>}
      </button>

      {/* Separator */}
      <div className="border-t border-gray-200 dark:border-gray-700 my-2" />

      {/* Folders section */}
      <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
        Folders
      </p>

      {/* Folder search */}
      <div className="relative mb-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={folderSearch}
          onChange={(e) => onFolderSearchChange(e.target.value)}
          placeholder="Search folders..."
          className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {/* Folder tree */}
      <FolderTree
        folders={folders}
        selectedId={!showDeleted && selectedFolder !== undefined ? selectedFolder : -1}
        onSelect={(id) => onSelectFolder(id ?? undefined)}
        search={folderSearch}
        onCreateFolder={onCreateFolder}
        onRenameFolder={onRenameFolder}
        onMoveFolder={onMoveFolder}
        onDeleteFolder={onDeleteFolder}
      />
    </>
  );
}
