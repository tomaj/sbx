'use client';

import { useState } from 'react';
import { GripVertical, Diamond } from 'lucide-react';
import type { WorkflowStageDetail } from '@sbx/types';

export function StageList({
  stages,
  spaceId,
  workflowId,
  onStageAdded,
  onStageClick,
}: {
  stages: WorkflowStageDetail[];
  spaceId: string;
  workflowId: string;
  onStageAdded: (stage: WorkflowStageDetail) => void;
  onStageClick: (stage: WorkflowStageDetail) => void;
}) {
  const [newColor, setNewColor] = useState('#07B2AF');
  const [newStageName, setNewStageName] = useState('');

  const sortedStages = stages.slice().sort((a, b) => a.position - b.position);

  async function addStage() {
    if (!newStageName.trim()) return;
    const res = await fetch(`/api/admin/spaces/${spaceId}/workflows/${workflowId}/stages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newStageName.trim(), color: newColor }),
    });
    const data = await res.json();
    if (data.workflow_stage) {
      onStageAdded(data.workflow_stage);
      setNewStageName('');
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
        Workflow Stages
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        These are the stages of this workflow. And they are ordered according to the order
        configured here, and the first item in this list is automatically activated in stories that
        use this workflow.
      </p>

      <div className="grid grid-cols-[140px_1fr_auto] gap-3 mb-2 items-end">
        <div>
          <label
            htmlFor="stage-color"
            className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1"
          >
            Color <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg">
            <Diamond className="w-4 h-4 shrink-0" style={{ color: newColor }} />
            <input
              id="stage-color"
              type="text"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              maxLength={7}
              className="flex-1 text-sm text-gray-900 dark:text-gray-100 bg-transparent outline-none w-0"
            />
          </div>
          <p className="mt-1 text-xs text-gray-400 text-right">7/7</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Stage name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addStage()}
            placeholder="Drafting, Reviewing..."
            maxLength={20}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <p className="mt-1 text-xs text-gray-400 text-right">{newStageName.length}/20</p>
        </div>
        <button
          type="button"
          onClick={addStage}
          disabled={!newStageName.trim()}
          className="px-4 py-2 text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 disabled:opacity-40 disabled:cursor-not-allowed mb-5"
        >
          Add
        </button>
      </div>

      {sortedStages.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Defined stages
          </p>
          <div className="space-y-2">
            {sortedStages.map((stage) => (
              <button
                key={stage.id}
                type="button"
                onClick={() => onStageClick(stage)}
                className="w-full flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-left"
              >
                <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />
                <Diamond className="w-5 h-5 shrink-0" style={{ color: stage.color }} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {stage.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {stage.allow_all_stages ? 'All stages' : 'Specific stages'}
                    {' · '}
                    {stage.allow_all_users ? 'All users' : 'Specific users'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
