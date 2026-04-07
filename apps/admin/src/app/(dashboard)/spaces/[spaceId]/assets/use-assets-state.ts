import { useState, useCallback } from 'react';

export function useAssetsState() {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [bulkTagOpen, setBulkTagOpen] = useState(false);
  const [bulkTagSaving, setBulkTagSaving] = useState(false);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((allIds: number[]) => {
    setSelectedIds(new Set(allIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    selectedIds,
    setSelectedIds,
    viewMode,
    setViewMode,
    bulkTagOpen,
    setBulkTagOpen,
    bulkTagSaving,
    setBulkTagSaving,
    toggleSelect,
    selectAll,
    clearSelection,
  };
}
