'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface PermissionDef {
  key: string;
  label: string;
  alwaysOn?: boolean;
  isDeny?: boolean;
}

interface PermissionGroup {
  label: string;
  permissions: PermissionDef[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: 'Content & Editor',
    permissions: [
      { key: 'read_stories', label: 'Allow reading content', alwaysOn: true },
      { key: 'save_stories', label: 'Allow saving content' },
      { key: 'publish_stories', label: 'Allow publishing stories' },
      { key: 'unpublish_stories', label: 'Allow unpublishing stories' },
      { key: 'publish_folders', label: 'Allow publishing folders' },
      { key: 'unpublish_folders', label: 'Allow unpublishing folders' },
      { key: 'deploy_pipelines', label: 'Allow deploying pipelines' },
      { key: 'delete_content', label: 'Allow deleting content' },
      { key: 'edit_image', label: 'Deny access to image editor', isDeny: true },
      { key: 'view_composer', label: 'Deny access to visual editor', isDeny: true },
      { key: 'change_alternate_group', label: 'Deny changing alternates group', isDeny: true },
      { key: 'move_story', label: 'Deny moving a story', isDeny: true },
      { key: 'edit_story_slug', label: 'Deny changing the slug of a story', isDeny: true },
      { key: 'force_release', label: 'Force user to use a release' },
      { key: 'allow_private_releases', label: 'Allow full access to private releases' },
      { key: 'hide_content_unauthorized', label: 'Hide content if unauthorized' },
      { key: 'hide_folders_unauthorized', label: 'Hide folders if unauthorized' },
      { key: 'access_draft_json', label: 'Allow accessing Draft JSON' },
      { key: 'access_published_json', label: 'Allow accessing Published JSON' },
    ],
  },
  {
    label: 'Tags',
    permissions: [{ key: 'manage_tags', label: 'Allow managing tags' }],
  },
];

function isPermissionEnabled(permissions: string[], def: PermissionDef): boolean {
  if (def.alwaysOn) return true;
  if (def.isDeny) return !permissions.includes(def.key);
  return permissions.includes(def.key);
}

function togglePermission(permissions: string[], def: PermissionDef, checked: boolean): string[] {
  if (def.alwaysOn) return permissions;
  if (def.isDeny) {
    if (checked) return permissions.filter((p) => p !== def.key);
    return permissions.includes(def.key) ? permissions : [...permissions, def.key];
  }
  if (checked) return permissions.includes(def.key) ? permissions : [...permissions, def.key];
  return permissions.filter((p) => p !== def.key);
}

interface PermissionGridProps {
  permissions: string[];
  onPermissionsChange: (p: string[]) => void;
}

export function PermissionGrid({ permissions, onPermissionsChange }: PermissionGridProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Content & Editor']));

  function toggleGroup(label: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {PERMISSION_GROUPS.map((group) => {
        const expanded = expandedGroups.has(group.label);
        const checkedCount = group.permissions.filter((p) =>
          isPermissionEnabled(permissions, p),
        ).length;
        return (
          <div
            key={group.label}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggleGroup(group.label)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <span className="flex items-center gap-2">
                {expanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
                {group.label}
              </span>
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                {checkedCount}/{group.permissions.length}
              </span>
            </button>
            {expanded && (
              <div className="px-4 py-3 space-y-2.5 bg-white dark:bg-gray-900">
                {group.permissions.map((def) => {
                  const checked = isPermissionEnabled(permissions, def);
                  return (
                    <label
                      key={def.key}
                      className={`flex items-center gap-3 cursor-pointer ${def.alwaysOn ? 'opacity-60' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={def.alwaysOn}
                        onChange={(e) =>
                          onPermissionsChange(togglePermission(permissions, def, e.target.checked))
                        }
                        className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 shrink-0"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{def.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
