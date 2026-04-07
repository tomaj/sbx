'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useApi } from '@/lib/swr';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import type { StoryDetail } from '../types';

interface UseStoryEditorOptions {
  spaceId: string;
  initialStory: StoryDetail | null;
  releaseId: number | null;
}

export function useStoryEditor({ spaceId, initialStory, releaseId }: UseStoryEditorOptions) {
  const [story, setStory] = useState<StoryDetail | null>(initialStory);
  const [content, setContent] = useState<Record<string, any>>(initialStory?.content ?? {});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard against field-initialization false positives (e.g. richtext normalisation on mount)
  const canMarkDirtyRef = useRef(false);

  const {
    showModal: showUnsavedModal,
    handleConfirm: confirmUnsaved,
    handleCancel: cancelUnsaved,
    guardNavigate,
  } = useUnsavedChanges(isDirty);

  // Sync state when story prop arrives (null → loaded)
  useEffect(() => {
    if (initialStory && !story) {
      setStory(initialStory);
      setContent(initialStory.content ?? {});
    }
  }, [initialStory, story]);

  // Delay enabling dirty tracking to avoid false positives from field initialization
  useEffect(() => {
    canMarkDirtyRef.current = false;
    const t = setTimeout(() => {
      canMarkDirtyRef.current = true;
    }, 400);
    return () => clearTimeout(t);
  }, []);

  // Update document title
  useEffect(() => {
    if (story?.name) {
      const prev = document.title;
      document.title = `${story.name} | SBX`;
      return () => {
        document.title = prev;
      };
    }
  }, [story?.name]);

  // Load discussion counts per field for badges
  const discussionsUrl = story?.id
    ? `/api/admin/spaces/${spaceId}/stories/${story.id}/discussions`
    : null;
  const { data: discussionsData, mutate: mutateDiscussions } = useApi<{
    discussions?: Array<{ field_key: string | null; comments: any[] }>;
  }>(discussionsUrl);

  const [discussionCounts, setDiscussionCounts] = useState<Record<string, number>>({});
  const [openDiscussionCount, setOpenDiscussionCount] = useState(0);

  useEffect(() => {
    const counts: Record<string, number> = {};
    let totalOpen = 0;
    for (const d of discussionsData?.discussions ?? []) {
      totalOpen++;
      if (d.field_key) {
        counts[d.field_key] = (counts[d.field_key] ?? 0) + (d.comments?.length ?? 1);
      }
    }
    setDiscussionCounts(counts);
    setOpenDiscussionCount(totalOpen);
  }, [discussionsData]);

  const handleFieldChange = useCallback((key: string, value: any) => {
    setContent((prev) => ({ ...prev, [key]: value }));
    if (canMarkDirtyRef.current) setIsDirty(true);
  }, []);

  async function save(): Promise<StoryDetail | null> {
    if (!story) return null;
    setIsSaving(true);
    setError(null);
    try {
      const mapiBody: Record<string, any> = { story: { content } };
      if (releaseId != null) mapiBody.release_id = releaseId;
      const res = await fetch(`/api/admin/spaces/${spaceId}/stories/${story.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapiBody),
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      const updated = data.story as StoryDetail;
      setStory(updated);
      setContent(updated.content);
      setIsDirty(false);
      return updated;
    } catch {
      setError('Failed to save. Please try again.');
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublish() {
    if (!story) return;
    await save();
    setIsPublishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/stories/${story.id}/publish`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Publish failed');
      const data = await res.json();
      setStory(data.story as StoryDetail);
    } catch {
      setError('Failed to publish. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleUnpublish() {
    if (!story) return;
    setIsPublishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/stories/${story.id}/unpublish`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Unpublish failed');
      const data = await res.json();
      setStory(data.story as StoryDetail);
    } catch {
      setError('Failed to unpublish. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleConfigSave(data: Partial<StoryDetail>) {
    if (!story) return;
    setIsSaving(true);
    setError(null);
    try {
      const mapiBody: Record<string, any> = { story: data };
      if (releaseId != null) mapiBody.release_id = releaseId;
      const res = await fetch(`/api/admin/spaces/${spaceId}/stories/${story.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapiBody),
      });
      if (!res.ok) throw new Error('Save failed');
      const result = await res.json();
      setStory(result.story as StoryDetail);
    } catch {
      setError('Failed to save configuration.');
    } finally {
      setIsSaving(false);
    }
  }

  return {
    story,
    setStory,
    content,
    isDirty,
    isSaving,
    isPublishing,
    error,
    showUnsavedModal,
    confirmUnsaved,
    cancelUnsaved,
    guardNavigate,
    discussionCounts,
    openDiscussionCount,
    mutateDiscussions,
    handleFieldChange,
    save,
    handlePublish,
    handleUnpublish,
    handleConfigSave,
  };
}
