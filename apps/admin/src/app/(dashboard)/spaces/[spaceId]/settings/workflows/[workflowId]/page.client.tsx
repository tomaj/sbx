'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';
import { ContentTypeSelector } from '@/components/ui/content-type-selector';
import type { WorkflowStageDetail } from '@sbx/types';
import { SkeletonText, SkeletonBlock } from '@/components/ui/skeleton';
import { FormField, inputCls } from '@/components/ui/form-field';
import { useApi } from '@/lib/swr';
import { EditStagePanel } from './edit-stage-panel';
import { StageList } from './stage-list';

export default function WorkflowEditorPage({
  params,
}: {
  params: Promise<{ spaceId: string; workflowId: string }>;
}) {
  const { spaceId, workflowId } = use(params);
  const isNew = workflowId === 'new';
  const router = useRouter();

  const [name, setName] = useState('');
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [stages, setStages] = useState<WorkflowStageDetail[]>([]);
  const [editingStage, setEditingStage] = useState<WorkflowStageDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(isNew);
  const [_isDirty, setIsDirty] = useState(false);

  const { data: workflowData, isLoading } = useApi<{
    workflow: { name: string; content_types: string[]; stages: WorkflowStageDetail[] };
  }>(!isNew ? `/api/admin/spaces/${spaceId}/workflows/${workflowId}` : null);

  useEffect(() => {
    if (!workflowData?.workflow || initialized) return;
    setName(workflowData.workflow.name);
    setContentTypes(workflowData.workflow.content_types ?? []);
    setStages(workflowData.workflow.stages ?? []);
    setInitialized(true);
  }, [workflowData, initialized]);

  const loading = !isNew && isLoading && !initialized;

  async function handleSave() {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        const res = await fetch(`/api/admin/spaces/${spaceId}/workflows`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), contentTypes }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? 'Failed');
        setIsDirty(false);
        router.push(`/spaces/${spaceId}/settings/workflows/${data.workflow.id}`);
      } else {
        const res = await fetch(`/api/admin/spaces/${spaceId}/workflows/${workflowId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), contentTypes }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.message ?? 'Failed');
        }
        setIsDirty(false);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleStageAdded(stage: WorkflowStageDetail) {
    setStages((prev) => [...prev, stage]);
  }

  function handleStageUpdated(updated: WorkflowStageDetail) {
    setStages((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setEditingStage(null);
  }

  function handleStageDeleted() {
    if (!editingStage) return;
    setStages((prev) => prev.filter((s) => s.id !== editingStage.id));
    setEditingStage(null);
  }

  if (loading) {
    return (
      <div className="max-w-2xl px-10 py-8">
        <SkeletonText className="h-6 w-40 mb-8" />
        <div className="space-y-4">
          <SkeletonBlock className="h-10 w-full" />
          <SkeletonBlock className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl px-10 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link
            href={`/spaces/${spaceId}/settings/workflows`}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Workflows
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {isNew ? 'New Workflow' : 'Edit Workflow'}
        </h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg transition-colors"
        >
          <Check className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Workflow'}
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <FormField label="Name" required>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setIsDirty(true);
          }}
          placeholder="Workflow name"
          className={inputCls}
        />
      </FormField>

      <FormField label="Content types the workflow will be applied for" required>
        <ContentTypeSelector
          spaceId={spaceId}
          value={contentTypes}
          onChange={(v) => {
            setContentTypes(v);
            setIsDirty(true);
          }}
        />
      </FormField>

      <hr className="border-gray-200 dark:border-gray-700 mb-8" />

      {!isNew && (
        <StageList
          stages={stages}
          spaceId={spaceId}
          workflowId={workflowId}
          onStageAdded={handleStageAdded}
          onStageClick={setEditingStage}
        />
      )}

      <EditStagePanel
        stage={editingStage}
        spaceId={spaceId}
        workflowId={workflowId}
        onClose={() => setEditingStage(null)}
        onSaved={handleStageUpdated}
        onDeleted={handleStageDeleted}
      />
    </div>
  );
}
