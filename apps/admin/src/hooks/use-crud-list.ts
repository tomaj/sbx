'use client';

import { useState } from 'react';
import { useApi } from '@/lib/swr';
import { usePerPage } from '@/hooks/use-per-page';
import type { SortState } from '@/components/ui/data-table';

export interface UseCrudListOptions<T> {
  /** Receives URLSearchParams and returns the full API URL string */
  apiUrl: (qs: URLSearchParams) => string;
  defaultSort?: SortState;
  storageKey: string;
  defaultPerPage?: number;
}

/**
 * Encapsulates the repeated list-page pattern:
 * - search / sort / page / perPage state
 * - URLSearchParams construction
 * - useApi call
 * - Automatic page reset on search / sort / perPage change
 *
 * Usage:
 *   const { data, isLoading, mutate, search, setSearch, sort, setSort,
 *           page, setPage, perPage, setPerPage } =
 *     useCrudList<ApiResponse>({
 *       apiUrl: (qs) => `/api/admin/spaces/${spaceId}/datasources?${qs}`,
 *       defaultSort: { field: 'name', direction: 'asc' },
 *       storageKey: 'perPage:datasources',
 *     });
 */
export function useCrudList<T>({
  apiUrl,
  defaultSort = { field: 'id', direction: 'asc' },
  storageKey,
  defaultPerPage = 25,
}: UseCrudListOptions<T>) {
  const [search, setSearchRaw] = useState('');
  const [sort, setSortRaw] = useState<SortState>(defaultSort);
  const [page, setPage] = useState(1);
  const [perPage, setPerPageRaw] = usePerPage(storageKey, defaultPerPage);

  const qs = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    sort_by: `${sort.field}:${sort.direction}`,
  });
  if (search.trim()) qs.set('search', search.trim());

  const { data, isLoading, mutate } = useApi<T>(apiUrl(qs));

  function setSearch(v: string) {
    setSearchRaw(v);
    setPage(1);
  }

  function setSort(field: string, direction: 'asc' | 'desc') {
    setSortRaw({ field, direction });
    setPage(1);
  }

  function setPerPage(n: number) {
    setPerPageRaw(n);
    setPage(1);
  }

  return {
    data,
    isLoading,
    mutate,
    search,
    setSearch,
    sort,
    setSort,
    page,
    setPage,
    perPage,
    setPerPage,
  };
}
