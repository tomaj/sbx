'use client';

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Pagination, type PaginationState } from './pagination';

export type { PaginationState } from './pagination';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  render: (row: T) => React.ReactNode;
  skeletonRender?: () => React.ReactNode;
}

export interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  sort?: SortState;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  selectedIds?: (string | number)[];
  onSelectChange?: (ids: (string | number)[]) => void;
  selectionActions?: React.ReactNode;
  pagination?: PaginationState;
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  sort,
  onSort,
  selectedIds = [],
  onSelectChange,
  selectionActions,
  pagination,
  isLoading,
  onRowClick,
  emptyMessage,
}: DataTableProps<T>) {
  // Map our Column<T> interface to TanStack ColumnDef<T>
  const columnDefs = useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((col) => ({
        id: col.key,
        accessorKey: col.key,
        header: col.label,
        enableSorting: col.sortable ?? false,
        cell: ({ row }) => col.render(row.original),
        meta: { skeletonRender: col.skeletonRender, width: col.width },
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns],
  );

  // Map external sort state → TanStack SortingState
  const sorting = useMemo<SortingState>(
    () => (sort ? [{ id: sort.field, desc: sort.direction === 'desc' }] : []),
    [sort],
  );

  // Map external selectedIds → TanStack rowSelection (keyed by keyField value)
  const rowSelection = useMemo(
    () => Object.fromEntries(selectedIds.map((id) => [String(id), true])),
    [selectedIds],
  );

  const table = useReactTable({
    data,
    columns: columnDefs,
    getRowId: (row) => String(row[keyField]),
    getCoreRowModel: getCoreRowModel(),
    // All state is controlled externally (server-side sort/pagination/filter)
    manualSorting: true,
    manualPagination: true,
    enableRowSelection: !!onSelectChange,
    state: {
      sorting,
      rowSelection,
    },
    onSortingChange: (updater) => {
      if (!onSort) return;
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      if (next.length > 0) {
        onSort(next[0].id, next[0].desc ? 'desc' : 'asc');
      }
    },
    onRowSelectionChange: (updater) => {
      if (!onSelectChange) return;
      const next = typeof updater === 'function' ? updater(rowSelection) : updater;
      const ids = Object.keys(next)
        .filter((k) => next[k])
        .map((k) => {
          const n = Number(k);
          return Number.isNaN(n) ? k : n;
        });
      onSelectChange(ids);
    },
  });

  const allPageSelected =
    data.length > 0 && table.getRowModel().rows.every((r) => r.getIsSelected());
  const somePageSelected = table.getRowModel().rows.some((r) => r.getIsSelected());

  return (
    <div className="flex flex-col">
      {selectedIds.length > 0 && selectionActions && (
        <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-2.5 flex items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {selectedIds.length} selected
          </span>
          {selectionActions}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-gray-200 dark:border-gray-700">
                {onSelectChange && (
                  <th className="w-10 px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = somePageSelected && !allPageSelected;
                      }}
                      onChange={table.getToggleAllRowsSelectedHandler()}
                      className="rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
                    />
                  </th>
                )}
                {headerGroup.headers.map((header) => {
                  const col = columns.find((c) => c.key === header.id);
                  return (
                    <th
                      key={header.id}
                      style={col?.width ? { width: col.width } : undefined}
                      className={cn(
                        'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide',
                        header.column.getCanSort() &&
                          'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200',
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <span className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() &&
                          (header.column.getIsSorted() === 'asc' ? (
                            <ArrowUp className="size-3.5" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ArrowDown className="size-3.5" />
                          ) : (
                            <ArrowUpDown className="size-3.5 opacity-40" />
                          ))}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                  {onSelectChange && (
                    <td className="w-10 px-4 py-3">
                      <div className="size-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      {col.skeletonRender ? (
                        col.skeletonRender()
                      ) : (
                        <div
                          className="h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse"
                          style={{
                            width: `${60 + ((i * 13 + col.key.length * 7) % 30)}%`,
                            animationDelay: `${i * 40}ms`,
                          }}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onSelectChange ? 1 : 0)}
                  className="text-center py-16 text-gray-400 text-sm"
                >
                  {emptyMessage ?? 'No results found'}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(
                    'border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                    row.getIsSelected() && 'bg-teal-50 dark:bg-teal-900/10',
                    onRowClick && 'cursor-pointer',
                  )}
                >
                  {onSelectChange && (
                    <td className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                        className="rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
                      />
                    </td>
                  )}
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && <Pagination {...pagination} />}
    </div>
  );
}
