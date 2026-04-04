'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, SlidersHorizontal, ChevronDown, X } from 'lucide-react';
import { SelectDropdown } from './select-dropdown';

export interface SortOption {
  value: string;
  label: string;
}

export type FilterFieldType = 'text' | 'select' | 'date';

export interface FilterField {
  key: string;
  label: string;
  type: FilterFieldType;
  options?: { value: string; label: string }[]; // for type='select'
}

export interface ActiveFilter {
  key: string;
  label: string;
  type: FilterFieldType;
  value: string;
  options?: { value: string; label: string }[];
}

interface SearchFilterBarProps {
  searchPlaceholder?: string;
  search: string;
  onSearchChange: (value: string) => void;
  sortOptions?: SortOption[];
  sort?: string;
  onSortChange?: (value: string) => void;
  filterFields?: FilterField[];
  activeFilters?: ActiveFilter[];
  onFiltersChange?: (filters: ActiveFilter[]) => void;
}

export function SearchFilterBar({
  searchPlaceholder = 'Search...',
  search,
  onSearchChange,
  sortOptions = [],
  sort,
  onSortChange,
  filterFields = [],
  activeFilters = [],
  onFiltersChange,
}: SearchFilterBarProps) {
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentSortLabel = sortOptions.find((o) => o.value === sort)?.label ?? 'Default';

  function addFilter(field: FilterField) {
    if (activeFilters.some((f) => f.key === field.key)) return;
    onFiltersChange?.([
      ...activeFilters,
      { key: field.key, label: field.label, type: field.type, value: '', options: field.options },
    ]);
    setFilterOpen(false);
  }

  function removeFilter(key: string) {
    onFiltersChange?.(activeFilters.filter((f) => f.key !== key));
  }

  function updateFilterValue(key: string, value: string) {
    onFiltersChange?.(activeFilters.map((f) => (f.key === key ? { ...f, value } : f)));
  }

  const availableFields = filterFields.filter((f) => !activeFilters.some((af) => af.key === f.key));

  return (
    <div className="flex flex-col gap-2">
      {/* Search + Filter + Sort row */}
      <div className="flex items-center gap-2">
        {/* Search input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter button */}
        {filterFields.length > 0 && (
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen((o) => !o)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors ${
                activeFilters.length > 0
                  ? 'border-teal-500 text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filter</span>
              {activeFilters.length > 0 && (
                <span className="bg-teal-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilters.length}
                </span>
              )}
            </button>
            {filterOpen && availableFields.length > 0 && (
              <div className="absolute top-full right-0 mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[180px]">
                <p className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Add filter
                </p>
                {availableFields.map((field) => (
                  <button
                    key={field.key}
                    onClick={() => addFilter(field)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    {field.label}
                  </button>
                ))}
              </div>
            )}
            {filterOpen && availableFields.length === 0 && activeFilters.length > 0 && (
              <div className="absolute top-full right-0 mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2 min-w-[180px]">
                <p className="text-sm text-gray-500 dark:text-gray-400">All filters applied</p>
              </div>
            )}
          </div>
        )}

        {/* Sort dropdown */}
        {sortOptions.length > 0 && onSortChange && (
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setSortOpen((o) => !o)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 whitespace-nowrap"
            >
              <span>Sort by: {currentSortLabel}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {sortOpen && (
              <div className="absolute top-full right-0 mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[200px]">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onSortChange(opt.value);
                      setSortOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm ${
                      sort === opt.value
                        ? 'text-teal-600 dark:text-teal-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {opt.value === sort && (
                      <span className="inline-block w-3 h-3 border-2 border-teal-500 rounded-sm mr-2 align-middle" />
                    )}
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <div
              key={filter.key}
              className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1"
            >
              <span className="text-xs text-gray-500 dark:text-gray-400">{filter.label}:</span>
              {filter.type === 'select' && filter.options ? (
                <SelectDropdown
                  ghost
                  value={filter.value || null}
                  onChange={(v) => updateFilterValue(filter.key, v ?? '')}
                  options={filter.options}
                  placeholder="Any"
                />
              ) : filter.type === 'date' ? (
                <input
                  type="date"
                  value={filter.value}
                  onChange={(e) => updateFilterValue(filter.key, e.target.value)}
                  className="text-xs text-gray-700 dark:text-gray-300 bg-transparent border-none outline-none"
                />
              ) : (
                <input
                  type="text"
                  value={filter.value}
                  onChange={(e) => updateFilterValue(filter.key, e.target.value)}
                  placeholder="value..."
                  className="text-xs text-gray-700 dark:text-gray-300 bg-transparent border-none outline-none w-24"
                />
              )}
              <button
                onClick={() => removeFilter(filter.key)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            onClick={() => onFiltersChange?.([])}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1 px-1"
          >
            <X className="w-3 h-3" /> Clear all
          </button>
        </div>
      )}
    </div>
  );
}
