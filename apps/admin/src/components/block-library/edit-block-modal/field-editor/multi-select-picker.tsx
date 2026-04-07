'use client';

import { useState } from 'react';
import { ChevronDown, Lock, Unlock } from 'lucide-react';

export function MultiSelectPicker({
  placeholder,
  selectedIds,
  items,
  loading,
  onToggle,
  onClearAll,
  renderItem,
}: {
  placeholder: string;
  selectedIds: string[];
  items: Array<{ id: string; label: string; sublabel?: string }>;
  loading?: boolean;
  onToggle: (id: string) => void;
  onClearAll: () => void;
  renderItem?: (item: { id: string; label: string; sublabel?: string }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const filtered = items.filter(
    (i) =>
      i.label.toLowerCase().includes(filter.toLowerCase()) ||
      (i.sublabel ?? '').toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="flex-1 relative min-w-0">
      <div
        onClick={() => {
          setOpen((v) => !v);
          setFilter('');
        }}
        className={`flex items-center gap-1.5 px-3 py-2 border rounded-r-lg cursor-pointer min-h-[40px] ${
          open
            ? 'border-teal-500 ring-2 ring-teal-200 dark:ring-teal-900'
            : 'border-gray-200 dark:border-gray-700'
        } bg-white dark:bg-gray-900`}
      >
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {selectedIds.length === 0 ? (
            <span className="text-sm text-teal-500 dark:text-teal-400">{placeholder}</span>
          ) : (
            selectedIds.map((id) => {
              const item = items.find((i) => i.id === id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-700 dark:text-gray-300"
                >
                  {item?.label ?? id}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle(id);
                    }}
                    className="text-gray-400 hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              );
            })
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClearAll();
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M7 7l6 6M13 7l-6 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-72 overflow-y-auto">
            {items.length > 5 && (
              <div className="sticky top-0 bg-white dark:bg-gray-900 px-3 pt-2 pb-1 border-b border-gray-100 dark:border-gray-800">
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter..."
                  className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            {loading ? (
              <div className="px-4 py-3 text-sm text-gray-400">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400">No items found</div>
            ) : (
              filtered.map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => onToggle(item.id)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    {renderItem ? (
                      renderItem(item)
                    ) : (
                      <>
                        <p className="text-sm text-gray-900 dark:text-gray-100">{item.label}</p>
                        {item.sublabel && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {item.sublabel}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function ModeDropdown({
  mode,
  onChange,
}: {
  mode: 'allow' | 'deny';
  onChange: (m: 'allow' | 'deny') => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-2 border border-r-0 border-gray-200 dark:border-gray-700 rounded-l-lg bg-white dark:bg-gray-900 h-full min-w-[80px]"
      >
        {mode === 'allow' ? (
          <Unlock className="w-4 h-4 text-teal-600" />
        ) : (
          <Lock className="w-4 h-4 text-gray-500" />
        )}
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl min-w-[120px] overflow-hidden">
            {(['allow', 'deny'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  onChange(m);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${
                  mode === m
                    ? 'bg-gray-50 dark:bg-gray-800 font-medium'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {m === 'allow' ? (
                  <Unlock className="w-3.5 h-3.5 text-teal-600" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-gray-500" />
                )}
                <span className="capitalize text-gray-700 dark:text-gray-300">
                  {m === 'allow' ? 'Allow' : 'Deny'}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
