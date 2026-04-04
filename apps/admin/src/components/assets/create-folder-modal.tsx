'use client';

import { useState, useEffect } from 'react';
import { X, Search, Folder, Home } from 'lucide-react';
import type { AssetFolder } from './folder-tree';

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
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setParentId(defaultParentId ?? null);
      setSearch('');
      setError(null);
    }
  }, [open, defaultParentId]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const filteredFolders = search.trim()
    ? folders.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    : folders;

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

          {/* Parent folder picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Parent folder
            </label>
            {/* Folder search */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search folders..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Folder list */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-y-auto max-h-52">
              {/* Root option */}
              <button
                onClick={() => setParentId(null)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors ${
                  parentId === null
                    ? 'bg-gray-100 dark:bg-gray-800 text-teal-600 dark:text-teal-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <Home
                  className={`w-4 h-4 ${parentId === null ? 'text-teal-500' : 'text-gray-400'}`}
                />
                Root
              </button>
              {filteredFolders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setParentId(f.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors ${
                    parentId === f.id
                      ? 'bg-gray-100 dark:bg-gray-800 text-teal-600 dark:text-teal-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Folder
                    className={`w-4 h-4 shrink-0 ${parentId === f.id ? 'text-teal-500' : 'text-gray-400'}`}
                  />
                  <span className="truncate">{f.name}</span>
                </button>
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
