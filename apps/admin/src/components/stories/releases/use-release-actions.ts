import { useState } from 'react';
import type { KeyedMutator } from 'swr';
import type { Release } from './types';

interface UseReleaseActionsOptions {
  spaceId: string;
  activeReleaseId: number | null;
  onActiveReleaseChange: (id: number | null) => void;
  mutateReleases: KeyedMutator<{ releases: Release[] }>;
}

export function useReleaseActions({
  spaceId,
  activeReleaseId,
  onActiveReleaseChange,
  mutateReleases,
}: UseReleaseActionsOptions) {
  const [saving, setSaving] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<{
    has_conflicts: boolean;
    conflicting_story_ids: number[];
  } | null>(null);

  async function openReleaseDetail(
    release: Release,
    setEditingRelease: (r: Release | null) => void,
    setReleaseName: (n: string) => void,
    setReleaseAt: (a: string) => void,
    setReleaseSidebarOpen: (v: boolean) => void,
  ) {
    setEditingRelease(release);
    setReleaseName(release.name);
    setReleaseAt(release.release_at ? new Date(release.release_at).toISOString().slice(0, 16) : '');
    setConflictInfo(null);
    setReleaseSidebarOpen(true);
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/releases/${release.id}/conflict-check`);
      if (res.ok) setConflictInfo(await res.json());
    } catch {}
  }

  async function saveRelease(
    editingRelease: Release | null,
    releaseName: string,
    releaseAt: string,
    setReleaseSidebarOpen: (v: boolean) => void,
  ) {
    setSaving(true);
    try {
      const body = { name: releaseName, release_at: releaseAt || null };
      if (editingRelease) {
        await fetch(`/api/admin/spaces/${spaceId}/releases/${editingRelease.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ release: body }),
        });
      } else {
        await fetch(`/api/admin/spaces/${spaceId}/releases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      await mutateReleases();
      setReleaseSidebarOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function publishRelease(
    target: Release | null,
    setPublishReleaseOpen: (v: boolean) => void,
    setReleaseSidebarOpen: (v: boolean) => void,
  ) {
    if (!target) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/spaces/${spaceId}/releases/${target.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ do_release: true }),
      });
      setPublishReleaseOpen(false);
      setReleaseSidebarOpen(false);
      if (activeReleaseId === target.id) onActiveReleaseChange(null);
      await mutateReleases();
    } finally {
      setSaving(false);
    }
  }

  async function saveScheduleDate(
    activeRelease: Release | null,
    scheduleDate: string,
    setScheduleDateOpen: (v: boolean) => void,
  ) {
    if (!activeRelease) return;
    await fetch(`/api/admin/spaces/${spaceId}/releases/${activeRelease.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        release: { name: activeRelease.name, release_at: scheduleDate || null },
      }),
    });
    await mutateReleases();
    setScheduleDateOpen(false);
  }

  async function confirmDeleteRelease(
    releaseToDelete: Release | null,
    setDeleteReleaseOpen: (v: boolean) => void,
    setReleaseSidebarOpen: (v: boolean) => void,
  ) {
    if (!releaseToDelete) return;
    await fetch(`/api/admin/spaces/${spaceId}/releases/${releaseToDelete.id}`, {
      method: 'DELETE',
    });
    if (activeReleaseId === releaseToDelete.id) onActiveReleaseChange(null);
    setDeleteReleaseOpen(false);
    setReleaseSidebarOpen(false);
    await mutateReleases();
  }

  return {
    saving,
    conflictInfo,
    setConflictInfo,
    openReleaseDetail,
    saveRelease,
    publishRelease,
    saveScheduleDate,
    confirmDeleteRelease,
  };
}
