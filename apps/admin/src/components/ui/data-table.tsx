'use client'

import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Pagination, type PaginationState } from './pagination'

export type { PaginationState } from './pagination'

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  width?: string
  render: (row: T) => React.ReactNode
  skeletonRender?: () => React.ReactNode
}

export interface SortState {
  field: string
  direction: 'asc' | 'desc'
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  sort?: SortState
  onSort?: (field: string, direction: 'asc' | 'desc') => void
  selectedIds?: (string | number)[]
  onSelectChange?: (ids: (string | number)[]) => void
  selectionActions?: React.ReactNode
  pagination?: PaginationState
  isLoading?: boolean
  onRowClick?: (row: T) => void
  emptyMessage?: string
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
  const allPageIds = data.map((row) => row[keyField] as string | number)
  const allSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.includes(id))
  const someSelected = allPageIds.some((id) => selectedIds.includes(id))

  function toggleAll() {
    if (!onSelectChange) return
    if (allSelected) {
      onSelectChange(selectedIds.filter((id) => !allPageIds.includes(id)))
    } else {
      const newIds = [...selectedIds]
      for (const id of allPageIds) {
        if (!newIds.includes(id)) newIds.push(id)
      }
      onSelectChange(newIds)
    }
  }

  function toggleRow(id: string | number) {
    if (!onSelectChange) return
    if (selectedIds.includes(id)) {
      onSelectChange(selectedIds.filter((i) => i !== id))
    } else {
      onSelectChange([...selectedIds, id])
    }
  }

  function handleSort(field: string) {
    if (!onSort) return
    if (sort?.field === field) {
      onSort(field, sort.direction === 'asc' ? 'desc' : 'asc')
    } else {
      onSort(field, 'asc')
    }
  }

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
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {onSelectChange && (
                <th className="w-10 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                    onChange={toggleAll}
                    className="rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide',
                    col.sortable && 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200',
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      sort?.field === col.key ? (
                        sort.direction === 'asc'
                          ? <ArrowUp className="size-3.5" />
                          : <ArrowDown className="size-3.5" />
                      ) : (
                        <ArrowUpDown className="size-3.5 opacity-40" />
                      )
                    )}
                  </span>
                </th>
              ))}
            </tr>
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
                      {col.skeletonRender ? col.skeletonRender() : (
                        <div
                          className="h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse"
                          style={{ width: `${60 + ((i * 13 + col.key.length * 7) % 30)}%`, animationDelay: `${i * 40}ms` }}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onSelectChange ? 1 : 0)}
                  className="text-center py-16 text-gray-400 text-sm"
                >
                  {emptyMessage ?? 'No results found'}
                </td>
              </tr>
            ) : (
              data.map((row) => {
                const id = row[keyField] as string | number
                const isSelected = selectedIds.includes(id)
                return (
                  <tr
                    key={String(id)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      'border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                      isSelected && 'bg-teal-50 dark:bg-teal-900/10',
                      onRowClick && 'cursor-pointer',
                    )}
                  >
                    {onSelectChange && (
                      <td className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(id)}
                          className="rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && <Pagination {...pagination} />}
    </div>
  )
}
