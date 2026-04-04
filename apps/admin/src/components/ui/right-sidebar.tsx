'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RightSidebarProps {
  open: boolean;
  onClose: () => void;
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
  width?: string;
}

export function RightSidebar({
  open,
  onClose,
  header,
  footer,
  children,
  width = 'w-[420px]',
}: RightSidebarProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/20 dark:bg-black/40 transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed top-0 right-0 z-50 h-full bg-white dark:bg-gray-900 shadow-xl flex flex-col transition-transform duration-200',
          width,
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 min-w-0">{header}</div>
          <button
            onClick={onClose}
            className="ml-4 shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">{children}</div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center">
          {footer}
        </div>
      </div>
    </>
  );
}
