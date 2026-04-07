import { useState } from 'react';
import type { Story } from '@/components/stories/story-list';

export function useContentActions(
  spaceId: string,
  selectedIds: Set<number>,
  currentUserId: number | null,
  displayStories: Story[],
  onSuccess: () => void,
  setLocalStories: (stories: Story[] | null) => void,
) {
  const [actionLoading, setActionLoading] = useState(false);

  async function handlePublish() {
    setActionLoading(true);
    try {
      await Promise.all(
        [...selectedIds].map((id) =>
          fetch(`/api/admin/spaces/${spaceId}/stories/${id}/publish`, { method: 'POST' }),
        ),
      );
      onSuccess();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUnpublish() {
    setActionLoading(true);
    try {
      await Promise.all(
        [...selectedIds].map((id) =>
          fetch(`/api/admin/spaces/${spaceId}/stories/${id}/unpublish`, { method: 'POST' }),
        ),
      );
      onSuccess();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    setActionLoading(true);
    try {
      await Promise.all(
        [...selectedIds].map((id) =>
          fetch(`/api/admin/spaces/${spaceId}/stories/${id}`, { method: 'DELETE' }),
        ),
      );
      onSuccess();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleFavorite(storyId: number) {
    if (currentUserId === null) return;
    const story = displayStories.find((s) => s.id === storyId);
    if (!story) return;
    const currentIds = story.favourite_for_user_ids ?? [];
    const isFav = currentIds.includes(currentUserId);
    const newIds = isFav
      ? currentIds.filter((id) => id !== currentUserId)
      : [...currentIds, currentUserId];
    // Optimistic update
    setLocalStories(
      displayStories.map((s) => (s.id === storyId ? { ...s, favourite_for_user_ids: newIds } : s)),
    );
    const res = await fetch(`/api/admin/spaces/${spaceId}/stories/${storyId}/partial_update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story: { favourite_for_user_ids: newIds } }),
    });
    if (!res.ok) {
      // Revert optimistic update
      setLocalStories(null);
    }
  }

  return { handlePublish, handleUnpublish, handleDelete, handleToggleFavorite, actionLoading };
}
