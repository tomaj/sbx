'use client';

import { useState, useEffect } from 'react';
import { FileText, Folder } from 'lucide-react';
import { RightSidebar } from '@/components/ui/right-sidebar';
import { SelectDropdown } from '@/components/ui/select-dropdown';
import { ContentTypeSelector } from '@/components/ui/content-type-selector';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { FormField } from '@/components/ui/form-field';
import { StoryConfigSection } from '@/components/stories/story-config-section';
import { useApi } from '@/lib/swr';

type Component = {
  id: number;
  name: string;
  display_name: string | null;
  is_root: boolean;
};

type FolderStory = {
  id: number;
  name: string;
  full_slug: string;
  is_folder: boolean;
};

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

function PanelFooter({
  onCancel,
  onConfirm,
  saving,
  disabled,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  saving: boolean;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-3 w-full">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled || saving}
        className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? 'Creating...' : 'Create'}
      </button>
    </div>
  );
}

function useFormData(open: boolean, defaultParentId: number | null) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [path, setPath] = useState('');
  const [parentId, setParentId] = useState<number | null>(defaultParentId);
  const [slugManual, setSlugManual] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName('');
    setSlug('');
    setPath('');
    setParentId(defaultParentId);
    setSlugManual(false);
    setError(null);
  }, [open, defaultParentId]);

  function handleNameChange(val: string) {
    setName(val);
    if (!slugManual) setSlug(toSlug(val));
  }

  function handleSlugChange(val: string) {
    setSlug(val);
    setSlugManual(true);
  }

  return {
    name,
    setName: handleNameChange,
    slug,
    setSlug: handleSlugChange,
    path,
    setPath,
    parentId,
    setParentId,
    error,
    setError,
  };
}

function useComponentOptions(open: boolean, spaceId: string) {
  const { data, isLoading } = useApi<{ components: Component[] }>(
    open ? `/api/admin/spaces/${spaceId}/components` : null,
  );
  const components = (data?.components ?? []).filter((c) => c.is_root);
  const options = components.map((c) => ({ value: c.name, label: c.display_name || c.name }));
  return { options, loading: isLoading };
}

function useSpaceDefaultRoot(open: boolean, spaceId: string) {
  const { data } = useApi<{ space: { default_root: string | null } }>(
    open ? `/api/admin/spaces/${spaceId}/space` : null,
  );
  return data?.space?.default_root ?? null;
}

function useFolderOptions(open: boolean, spaceId: string) {
  const { data, isLoading } = useApi<{ stories: FolderStory[] }>(
    open ? `/api/admin/spaces/${spaceId}/stories?per_page=200` : null,
  );
  const folders = (data?.stories ?? []).filter((s) => s.is_folder);
  const folderOptions = [
    { value: '', label: 'Root' },
    ...folders.map((f) => ({ value: String(f.id), label: f.name })),
  ];
  return { folderOptions, loading: isLoading };
}

// ─── New Content Story Panel ──────────────────────────────────────────────────

interface CreateStoryPanelProps {
  spaceId: string;
  open: boolean;
  defaultParentId: number | null;
  onClose: () => void;
  onCreated: (storyId: number) => void;
}

export function CreateStoryPanel({
  spaceId,
  open,
  defaultParentId,
  onClose,
  onCreated,
}: CreateStoryPanelProps) {
  const { name, setName, slug, setSlug, path, setPath, parentId, setParentId, error, setError } =
    useFormData(open, defaultParentId);
  const [contentType, setContentType] = useState('');
  const [saving, setSaving] = useState(false);
  const { options: compOptions, loading: compLoading } = useComponentOptions(open, spaceId);
  const { folderOptions, loading: folderLoading } = useFolderOptions(open, spaceId);
  const defaultRoot = useSpaceDefaultRoot(open, spaceId);

  useEffect(() => {
    if (!open) {
      setContentType('');
      return;
    }
    // Pre-select default_root if set and no type chosen yet
    if (defaultRoot && !contentType) {
      setContentType(defaultRoot);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultRoot, contentType]);

  const canCreate = name.trim() && slug.trim() && contentType;

  async function handleCreate() {
    if (!canCreate) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story: {
            name: name.trim(),
            slug: slug.trim(),
            path: path.trim() || null,
            parent_id: parentId,
            content: { component: contentType },
          },
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.message ?? 'Failed to create story');
        return;
      }
      const data = await res.json();
      onCreated(data.story?.id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <RightSidebar
      open={open}
      onClose={onClose}
      header={
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-teal-600" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            New Content Story
          </h2>
        </div>
      }
      footer={
        <PanelFooter
          onCancel={onClose}
          onConfirm={handleCreate}
          saving={saving}
          disabled={!canCreate}
        />
      }
    >
      <div>
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg mb-4">
            {error}
          </div>
        )}

        <StoryConfigSection
          name={name}
          onNameChange={setName}
          slug={slug}
          onSlugChange={setSlug}
          path={path}
          onPathChange={setPath}
          parentId={parentId}
          onParentIdChange={setParentId}
          folderOptions={folderOptions}
          folderLoading={folderLoading}
        />

        <FormField label="Content type" required>
          <SelectDropdown
            options={compOptions}
            value={contentType || null}
            onChange={(v) => setContentType(v ?? '')}
            placeholder={compLoading ? 'Loading...' : 'Select content type'}
          />
        </FormField>
      </div>
    </RightSidebar>
  );
}

// ─── New Folder Panel ─────────────────────────────────────────────────────────

interface CreateFolderPanelProps {
  spaceId: string;
  open: boolean;
  defaultParentId: number | null;
  onClose: () => void;
  onCreated: (storyId: number) => void;
}

export function CreateFolderPanel({
  spaceId,
  open,
  defaultParentId,
  onClose,
  onCreated,
}: CreateFolderPanelProps) {
  const { name, setName, slug, setSlug, path, setPath, parentId, setParentId, error, setError } =
    useFormData(open, defaultParentId);
  const [contentTypeMode, setContentTypeMode] = useState<'all' | 'specific'>('all');
  const [singleContentType, setSingleContentType] = useState<string | null>(null);
  const [multiContentTypes, setMultiContentTypes] = useState<string[]>([]);
  const [disableVisualEditor, setDisableVisualEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const { options: compOptions, loading: compLoading } = useComponentOptions(open, spaceId);
  const { folderOptions, loading: folderLoading } = useFolderOptions(open, spaceId);

  useEffect(() => {
    if (!open) {
      setContentTypeMode('all');
      setSingleContentType(null);
      setMultiContentTypes([]);
      setDisableVisualEditor(false);
    }
  }, [open]);

  const canCreate = name.trim() && slug.trim();

  async function handleCreate() {
    if (!canCreate) return;
    setSaving(true);
    setError(null);
    try {
      const selectedType =
        contentTypeMode === 'specific' ? (multiContentTypes[0] ?? null) : singleContentType;
      const content = selectedType ? { component: selectedType } : {};
      const res = await fetch(`/api/admin/spaces/${spaceId}/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story: {
            name: name.trim(),
            slug: slug.trim(),
            path: path.trim() || null,
            parent_id: parentId,
            is_folder: true,
            content,
          },
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.message ?? 'Failed to create folder');
        return;
      }
      const data = await res.json();
      onCreated(data.story?.id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <RightSidebar
      open={open}
      onClose={onClose}
      header={
        <div className="flex items-center gap-2">
          <Folder className="w-5 h-5 text-teal-600" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">New Folder</h2>
        </div>
      }
      footer={
        <PanelFooter
          onCancel={onClose}
          onConfirm={handleCreate}
          saving={saving}
          disabled={!canCreate}
        />
      }
    >
      <div>
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg mb-4">
            {error}
          </div>
        )}

        <StoryConfigSection
          name={name}
          onNameChange={setName}
          slug={slug}
          onSlugChange={setSlug}
          path={path}
          onPathChange={setPath}
          parentId={parentId}
          onParentIdChange={setParentId}
          folderOptions={folderOptions}
          folderLoading={folderLoading}
        />

        <FormField label="Content type" required>
          {/* Mode toggle */}
          <div className="flex items-center gap-4 mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="ctMode"
                checked={contentTypeMode === 'all'}
                onChange={() => setContentTypeMode('all')}
                className="accent-teal-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">All types</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="ctMode"
                checked={contentTypeMode === 'specific'}
                onChange={() => setContentTypeMode('specific')}
                className="accent-teal-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Specific content types
              </span>
            </label>
          </div>

          {/* Single select for "All types" default */}
          {contentTypeMode === 'all' && (
            <SelectDropdown
              options={compOptions}
              value={singleContentType}
              onChange={setSingleContentType}
              placeholder={compLoading ? 'Loading...' : 'Select default type (optional)'}
            />
          )}

          {/* Multi-select for "Specific content types" */}
          {contentTypeMode === 'specific' && (
            <ContentTypeSelector
              options={compOptions}
              value={multiContentTypes}
              onChange={setMultiContentTypes}
              placeholder={compLoading ? 'Loading...' : 'Select content types...'}
            />
          )}
        </FormField>

        <div className="mb-5">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Folder content settings
          </p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={disableVisualEditor}
              onChange={(e) => setDisableVisualEditor(e.target.checked)}
              className="accent-teal-600 w-4 h-4"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Disable visual editor (Form only)
            </span>
            <InfoTooltip text="Disabling the visual composer will let you focus on the component definition. Once you've setup the composer you can enable this option for the live-preview." />
          </label>
        </div>
      </div>
    </RightSidebar>
  );
}
