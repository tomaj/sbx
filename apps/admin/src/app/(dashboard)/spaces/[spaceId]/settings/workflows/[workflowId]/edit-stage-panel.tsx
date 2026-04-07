'use client';

import { useState, useEffect } from 'react';
import { Diamond } from 'lucide-react';
import { CrudSidebarForm } from '@/components/ui/crud-sidebar-form';
import type { WorkflowStageDetail } from '@sbx/types';
import { COLOR_PRESETS } from './constants';

export function EditStagePanel({
  stage,
  spaceId,
  workflowId,
  onClose,
  onSaved,
  onDeleted,
}: {
  stage: WorkflowStageDetail | null;
  spaceId: string;
  workflowId: string;
  onClose: () => void;
  onSaved: (updated: WorkflowStageDetail) => void;
  onDeleted: () => void;
}) {
  const [color, setColor] = useState(stage?.color ?? '#07B2AF');
  const [name, setName] = useState(stage?.name ?? '');
  const [isDefault, setIsDefault] = useState(stage?.is_default ?? false);
  const [allowPublish, setAllowPublish] = useState(stage?.allow_publish ?? false);
  const [allowAllStages, setAllowAllStages] = useState(stage?.allow_all_stages ?? true);
  const [allowAllUsers, setAllowAllUsers] = useState(stage?.allow_all_users ?? true);
  const [storyEditingLocked, setStoryEditingLocked] = useState(
    stage?.story_editing_locked ?? false,
  );
  const [autoRemoveAssignee, setAutoRemoveAssignee] = useState(
    stage?.auto_remove_assignee ?? false,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!stage) return;
    setColor(stage.color);
    setName(stage.name);
    setIsDefault(stage.is_default);
    setAllowPublish(stage.allow_publish);
    setAllowAllStages(stage.allow_all_stages);
    setAllowAllUsers(stage.allow_all_users);
    setStoryEditingLocked(stage.story_editing_locked);
    setAutoRemoveAssignee(stage.auto_remove_assignee);
  }, [stage]);

  async function handleSave() {
    if (!stage) return;
    setSaving(true);
    const res = await fetch(
      `/api/admin/spaces/${spaceId}/workflows/${workflowId}/stages/${stage.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          color,
          isDefault,
          allowPublish,
          allowAllStages,
          allowAllUsers,
          storyEditingLocked,
          autoRemoveAssignee,
        }),
      },
    );
    const data = await res.json();
    setSaving(false);
    if (data.workflow_stage) onSaved(data.workflow_stage);
  }

  async function handleDelete() {
    if (!stage) return;
    await fetch(`/api/admin/spaces/${spaceId}/workflows/${workflowId}/stages/${stage.id}`, {
      method: 'DELETE',
    });
    onDeleted();
  }

  return (
    <CrudSidebarForm
      open={!!stage}
      onClose={onClose}
      title="Edit stage"
      isSubmitting={saving}
      isDirty
      onSubmit={handleSave}
      onDelete={handleDelete}
      deleteTitle="Delete Stage"
      deleteMessage={`Are you sure you want to delete the "${name}" stage?`}
      noForm
    >
      <div className="grid grid-cols-[140px_1fr] gap-3">
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Color <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg">
            <Diamond className="w-4 h-4 shrink-0" style={{ color }} />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              maxLength={7}
              className="flex-1 text-sm text-gray-900 dark:text-gray-100 bg-transparent outline-none w-0"
            />
          </div>
          <p className="mt-1 text-xs text-gray-400 text-right">{color.length}/7</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-5 h-5 rounded-full border-2 ${color === c ? 'border-gray-600 dark:border-gray-300' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Stage name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <p className="mt-1 text-xs text-gray-400 text-right">{name.length}/20</p>
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Define as default stage for new content items
        </span>
      </label>

      <div>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Content rights
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Choose who has rights to publish and schedule content.
        </p>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allowPublish}
              onChange={(e) => setAllowPublish(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Administrators</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allowAllUsers}
              onChange={(e) => setAllowAllUsers(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">All users</span>
          </label>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Stage transition and access rules
        </p>

        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Lock editing</p>
        <label className="flex items-center gap-2 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={storyEditingLocked}
            onChange={(e) => setStoryEditingLocked(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Lock visual editor from editing when in this stage
          </span>
        </label>

        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          Next available stages
        </p>
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={allowAllStages}
              onChange={() => setAllowAllStages(true)}
              className="w-4 h-4 border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">All stages</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={!allowAllStages}
              onChange={() => setAllowAllStages(false)}
              className="w-4 h-4 border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Specific stages</span>
          </label>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Users/Roles who can change the stage from "{name}" to the next available stage.
        </p>
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={allowAllUsers}
              onChange={() => setAllowAllUsers(true)}
              className="w-4 h-4 border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">All users</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={!allowAllUsers}
              onChange={() => setAllowAllUsers(false)}
              className="w-4 h-4 border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Specific users/roles</span>
          </label>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRemoveAssignee}
            onChange={(e) => setAutoRemoveAssignee(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Unassigns users and roles when the content is published
          </span>
        </label>
      </div>
    </CrudSidebarForm>
  );
}
