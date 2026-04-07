'use client';

import { useEffect, useRef, useState } from 'react';

export function ColorPicker({
  label,
  colors,
  onSelect,
  activeColor,
  icon,
}: {
  label: string;
  colors: { label: string; color: string | null }[];
  onSelect: (color: string | null) => void;
  activeColor?: string | null;
  icon: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        title={label}
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className={`p-1.5 rounded transition-colors ${activeColor ? 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
      >
        {icon}
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-2 flex flex-wrap gap-1"
          style={{ minWidth: 120 }}
        >
          {colors.map((c) => (
            <button
              key={c.label}
              type="button"
              title={c.label}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(c.color);
                setOpen(false);
              }}
              className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:scale-110 transition-transform"
              style={{ backgroundColor: c.color ?? 'transparent' }}
            >
              {!c.color && <span className="text-xs text-gray-500">∅</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
