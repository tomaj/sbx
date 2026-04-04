'use client';

import { useEffect, useRef, useState } from 'react';

interface RenameModalProps {
  open: boolean;
  title?: string;
  currentName: string;
  onRename: (newName: string) => void | Promise<void>;
  onClose: () => void;
}

export function RenameModal({
  open,
  title = 'Rename',
  currentName,
  onRename,
  onClose,
}: RenameModalProps) {
  const [name, setName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(currentName);
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [open, currentName]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleConfirm() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await onRename(trimmed);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h2>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirm();
          }}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-teal-500 mb-4"
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            Rename
          </button>
        </div>
      </div>
    </div>
  );
}
