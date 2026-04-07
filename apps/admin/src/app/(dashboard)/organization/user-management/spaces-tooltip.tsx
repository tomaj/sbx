'use client';

import { useState, useRef } from 'react';
import type { UserSpace } from '@sbx/types';

export function SpacesTooltip({ spaces }: { spaces: UserSpace[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  function handleMouseEnter() {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
    setOpen(true);
  }

  if (spaces.length === 0) return <span className="text-sm text-gray-400">—</span>;

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setOpen(false)}
        className="text-sm text-teal-600 dark:text-teal-400 hover:underline whitespace-nowrap"
      >
        Active in {spaces.length} {spaces.length === 1 ? 'space' : 'spaces'}
      </button>
      {open && (
        <div
          role="tooltip"
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[240px] py-2"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          {spaces.map((s) => (
            <div key={s.id} className="px-4 py-2.5">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                #{s.id} · {s.role}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
