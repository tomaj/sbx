'use client';

import { useState } from 'react';
import { Search, Pencil, Trash2, Plus, Tag } from 'lucide-react';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { RenameModal } from '@/components/ui/rename-modal';

export interface ComponentInternalTag {
  id: number | string;
  name: string;
  count: number;
}

interface TagsViewProps {
  tags: ComponentInternalTag[];
  isLoading: boolean;
  onCreateTag: (name: string) => Promise<void>;
  onRenameTag: (tag: ComponentInternalTag, newName: string) => Promise<void>;
  onDeleteTag: (tag: ComponentInternalTag) => Promise<void>;
}

export function TagsView({
  tags,
  isLoading,
  onCreateTag,
  onRenameTag,
  onDeleteTag,
}: TagsViewProps) {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const [renameTag, setRenameTag] = useState<ComponentInternalTag | null>(null);

  const [deleteTag, setDeleteTag] = useState<ComponentInternalTag | null>(null);

  const filtered = search.trim()
    ? tags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : tags;

  async function handleCreate() {
    if (!createName.trim()) return;
    setCreateLoading(true);
    try {
      await onCreateTag(createName.trim());
      setCreateName('');
      setCreateOpen(false);
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleRename(newName: string) {
    if (!renameTag) return;
    await onRenameTag(renameTag, newName);
    setRenameTag(null);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-6 pt-4 pb-3 flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tags..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <button
          onClick={() => {
            setCreateName('');
            setCreateOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Tag
        </button>
      </div>

      {/* Tag list */}
      <div className="flex-1 overflow-y-auto px-6 pb-4">
        {isLoading ? (
          <div className="space-y-2 mt-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse flex items-center gap-4 py-3 border-b border-gray-100 dark:border-gray-800"
              >
                <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded ml-auto" />
                <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Tag className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">{search ? 'No tags match your search' : 'No tags yet'}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Tag
                </th>
                <th className="text-left py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Blocks
                </th>
                <th className="py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((tag) => (
                <tr
                  key={tag.id}
                  className="border-b border-gray-100 dark:border-gray-800 group hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="py-3 pr-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                      {tag.name}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-sm text-gray-600 dark:text-gray-400">
                    {tag.count}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setRenameTag(tag)}
                        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        title="Rename tag"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTag(tag)}
                        className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Delete tag"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create tag modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCreateOpen(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">New Tag</h2>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') setCreateOpen(false);
              }}
              placeholder="Tag name"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-teal-500 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!createName.trim() || createLoading}
                className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {createLoading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename tag modal */}
      <RenameModal
        open={!!renameTag}
        title="Rename Tag"
        currentName={renameTag?.name ?? ''}
        onRename={handleRename}
        onClose={() => setRenameTag(null)}
      />

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteTag}
        title="Delete Tag"
        message={`Delete tag "${deleteTag?.name}"? It will be removed from all ${deleteTag?.count ?? 0} block${deleteTag?.count === 1 ? '' : 's'}.`}
        confirmLabel="Delete"
        dangerous
        onConfirm={async () => {
          if (deleteTag) await onDeleteTag(deleteTag);
          setDeleteTag(null);
        }}
        onCancel={() => setDeleteTag(null)}
      />
    </div>
  );
}
