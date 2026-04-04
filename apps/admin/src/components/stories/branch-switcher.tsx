'use client';

import { useState } from 'react';
import { GitBranch, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { SkeletonText } from '@/components/ui/skeleton';
import { useApi } from '@/lib/swr';

export type Branch = {
  id: number;
  name: string;
  url: string | null;
};

interface BranchSwitcherProps {
  spaceId: string;
  onActiveBranchChange?: (branch: Branch | null) => void;
}

export function BranchSwitcher({ spaceId, onActiveBranchChange }: BranchSwitcherProps) {
  const [activeBranchId, setActiveBranchId] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { data } = useApi<{ branches: Branch[] }>(`/api/admin/spaces/${spaceId}/branches`, {
    onSuccess: (d) => {
      const list = d.branches ?? [];
      if (!initialized && list.length > 0) {
        setActiveBranchId(list[0].id);
        onActiveBranchChange?.(list[0]);
        setInitialized(true);
      }
    },
  });

  const branches = data?.branches ?? [];
  const activeBranch = branches.find((b) => b.id === activeBranchId) ?? branches[0] ?? null;

  return (
    <div className="px-8 pt-3 pb-2 flex items-center gap-2">
      <div className="relative">
        <button
          onClick={() => setShowDropdown((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <GitBranch className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
          <span className="text-gray-500 dark:text-gray-400 text-xs">Preview</span>
          <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
            {activeBranch ? activeBranch.name : <SkeletonText className="w-16 h-3 align-middle" />}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
        </button>

        {showDropdown && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowDropdown(false)} />
            <div className="absolute left-0 top-full mt-1 z-40 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
              {branches.length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-400">No branches</div>
              )}
              {branches.map((branch) => (
                <button
                  key={branch.id}
                  onClick={() => {
                    setActiveBranchId(branch.id);
                    setShowDropdown(false);
                    onActiveBranchChange?.(branch);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    activeBranchId === branch.id
                      ? 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/20'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {branch.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pipelines settings link */}
      <a
        href={`/spaces/${spaceId}/settings/pipelines`}
        title="Open pipelines settings"
        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <SlidersHorizontal className="w-4 h-4" />
      </a>
    </div>
  );
}
