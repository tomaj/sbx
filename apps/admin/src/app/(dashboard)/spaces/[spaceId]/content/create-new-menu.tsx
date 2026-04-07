'use client';

import { useState } from 'react';
import { Plus, SquarePen, Files } from 'lucide-react';

interface CreateNewMenuProps {
  onCreateStory: () => void;
  onCreateFolder: () => void;
}

export function CreateNewMenu({ onCreateStory, onCreateFolder }: CreateNewMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Create new
      </button>
      {open && (
        <>
          {/* biome-ignore lint/a11y/noStaticElementInteractions: dropdown dismiss */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: dropdown dismiss */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-40 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onCreateStory();
              }}
              className="w-full text-left px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-start gap-3">
                <SquarePen className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Story</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    A &ldquo;Story&rdquo; is what we call the content entries you can create.
                  </div>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onCreateFolder();
              }}
              className="w-full text-left px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <Files className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Folder</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Can be used to group your entries of specific content types.
                  </div>
                </div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
