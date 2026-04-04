'use client';

import { use } from 'react';
import Link from 'next/link';
import { Plus, Settings, Lock } from 'lucide-react';
import { useApi } from '@/lib/swr';
import { useDelete } from '@/hooks/use-delete';
import { EmptyState } from '@/components/ui/empty-state';
import type { Workflow, WorkflowStage } from '@sbx/types';
import { SkeletonText, SkeletonBlock, SkeletonBadge } from '@/components/ui/skeleton';

function StageBadge({ stage }: { stage: WorkflowStage }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium text-white"
      style={{ backgroundColor: stage.color }}
    >
      {stage.name}
    </span>
  );
}

export default function WorkflowsPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params);

  const { data, isLoading, mutate } = useApi<{ workflows: Workflow[] }>(
    `/api/admin/spaces/${spaceId}/workflows`,
  );
  const workflows = data?.workflows ?? [];

  const workflowDelete = useDelete<Workflow>({
    getUrl: (w) => `/api/admin/spaces/${spaceId}/workflows/${w.id}`,
    onSuccess: () => mutate(),
    title: 'Delete Workflow',
    getMessage: (w) => `Are you sure you want to delete "${w.name}"?`,
  });

  return (
    <div className="max-w-3xl px-10 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Workflows</h1>
        <Link
          href={`/spaces/${spaceId}/settings/workflows/new`}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Workflow
        </Link>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        A workflow is a set of stages to define the roadmap for a content process. You can set up
        different workflows for different types of content.
      </p>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <div className="flex items-start gap-4">
                <SkeletonBlock height="h-5" width="w-5" className="mt-0.5" />
                <div className="flex-1 space-y-2">
                  <SkeletonText width="w-32" />
                  <SkeletonText width="w-48" height="h-3" />
                  <div className="flex gap-1.5 mt-3">
                    <SkeletonBadge width="w-16" />
                    <SkeletonBadge width="w-20" />
                    <SkeletonBadge width="w-24" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <EmptyState
          message="No workflows configured yet."
          action={
            <Link
              href={`/spaces/${spaceId}/settings/workflows/new`}
              className="text-sm text-teal-600 dark:text-teal-400 hover:underline"
            >
              Create your first workflow
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {workflows.map((w) => (
            <div
              key={w.id}
              className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 p-5"
            >
              <div className="flex items-start gap-4">
                <div className="mt-0.5 text-gray-300 dark:text-gray-600">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
                    {w.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    {w.content_types.length === 0
                      ? 'All content types and folders'
                      : w.content_types.join(', ')}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {w.stages
                      .slice()
                      .sort((a, b) => a.position - b.position)
                      .map((s) => (
                        <StageBadge key={s.id} stage={s} />
                      ))}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/spaces/${spaceId}/settings/workflows/${w.id}`}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {workflowDelete.modal}
    </div>
  );
}
