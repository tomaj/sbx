'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SelectDropdown } from './select-dropdown';

export interface PaginationState {
  total: number;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  /** localStorage key for persisting perPage per entity (e.g. "perPage:components") */
  storageKey?: string;
}

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

export function Pagination({
  total,
  page,
  perPage,
  onPageChange,
  onPerPageChange,
  storageKey,
}: PaginationState) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className="bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-700 px-4 py-2.5 flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
      <div className="flex items-center gap-2">
        <span className="whitespace-nowrap">Items per page:</span>
        <SelectDropdown
          compact
          dropUp
          value={String(perPage)}
          onChange={(v) => {
            if (v) {
              onPerPageChange(Number(v));
              onPageChange(1);
              if (storageKey) {
                try {
                  localStorage.setItem(storageKey, v);
                } catch {}
              }
            }
          }}
          options={PER_PAGE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
        />
      </div>

      <span className="whitespace-nowrap">
        {from}–{to} of {total} items
      </span>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <span>Page</span>
        <SelectDropdown
          compact
          value={String(page)}
          onChange={(v) => {
            if (v) onPageChange(Number(v));
          }}
          options={Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => ({
            value: String(n),
            label: String(n),
          }))}
        />
        <span>of {totalPages}</span>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
