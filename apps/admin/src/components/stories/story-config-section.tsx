'use client';

import { FormField, inputCls } from '@/components/ui/form-field';
import { SelectDropdown } from '@/components/ui/select-dropdown';

interface FolderOption {
  value: string;
  label: string;
}

interface StoryConfigSectionProps {
  name: string;
  onNameChange: (v: string) => void;
  slug: string;
  onSlugChange: (v: string) => void;
  path: string;
  onPathChange: (v: string) => void;
  parentId: number | null;
  onParentIdChange: (v: number | null) => void;
  folderOptions: FolderOption[];
  folderLoading: boolean;
  namePlaceholder?: string;
}

/**
 * Shared config fields for creating stories and folders:
 * Name, Slug, Real Path, and Parent folder.
 */
export function StoryConfigSection({
  name,
  onNameChange,
  slug,
  onSlugChange,
  path,
  onPathChange,
  parentId,
  onParentIdChange,
  folderOptions,
  folderLoading,
  namePlaceholder = 'e.g. Landing',
}: StoryConfigSectionProps) {
  return (
    <>
      <FormField label="Name" required>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={namePlaceholder}
          className={inputCls}
        />
      </FormField>

      <FormField label="Slug">
        <input
          type="text"
          value={slug}
          onChange={(e) => onSlugChange(e.target.value)}
          className={inputCls}
        />
      </FormField>

      <FormField
        label="Real Path"
        description="The real path is the location that the editor opens if the location differs from the slug defined."
      >
        <textarea
          value={path}
          onChange={(e) => onPathChange(e.target.value)}
          rows={3}
          className={`${inputCls} resize-none`}
        />
      </FormField>

      <FormField label="Parent folder">
        <SelectDropdown
          options={folderOptions}
          value={parentId !== null ? String(parentId) : ''}
          onChange={(v) => onParentIdChange(v ? parseInt(v, 10) : null)}
          placeholder="Root"
          loading={folderLoading}
        />
      </FormField>
    </>
  );
}
