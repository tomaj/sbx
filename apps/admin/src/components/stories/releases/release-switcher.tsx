'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useApi } from '@/lib/swr';
import type { Release, ReleaseSwitcherProps } from './types';
import { useReleaseActions } from './use-release-actions';
import { ReleaseDropdown } from './release-dropdown';
import { ReleaseActionBar } from './release-action-bar';
import { ReleaseFormSidebar } from './release-form-sidebar';

export function ReleaseSwitcher({
  spaceId,
  activeReleaseId,
  onActiveReleaseChange,
  showReleaseContentOnly,
  onShowReleaseContentOnlyChange,
  onReleasesChange,
}: ReleaseSwitcherProps) {
  const [showReleasesDropdown, setShowReleasesDropdown] = useState(false);
  const [releaseSearch, setReleaseSearch] = useState('');

  const [releaseSidebarOpen, setReleaseSidebarOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState<Release | null>(null);
  const [releaseName, setReleaseName] = useState('');
  const [releaseAt, setReleaseAt] = useState('');

  const [deleteReleaseOpen, setDeleteReleaseOpen] = useState(false);
  const [releaseToDelete, setReleaseToDelete] = useState<Release | null>(null);
  const [publishReleaseOpen, setPublishReleaseOpen] = useState(false);

  const [scheduleDateOpen, setScheduleDateOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');

  const {
    data: releasesData,
    isLoading: releasesLoading,
    mutate: mutateReleases,
  } = useApi<{
    releases: Release[];
  }>(`/api/admin/spaces/${spaceId}/releases`);

  const releases = releasesData?.releases ?? [];
  const activeRelease = releases.find((r) => r.id === activeReleaseId) ?? null;
  const unreleased = releases.filter((r) => !r.released);

  useEffect(() => {
    if (releasesData) onReleasesChange?.(releasesData.releases ?? []);
  }, [releasesData, onReleasesChange]);

  const actions = useReleaseActions({
    spaceId,
    activeReleaseId,
    onActiveReleaseChange,
    mutateReleases,
  });

  function openCreateRelease() {
    setEditingRelease(null);
    setReleaseName('');
    setReleaseAt('');
    actions.setConflictInfo(null);
    setReleaseSidebarOpen(true);
  }

  function handleOpenReleaseDetail(release: Release) {
    actions.openReleaseDetail(
      release,
      setEditingRelease,
      setReleaseName,
      setReleaseAt,
      setReleaseSidebarOpen,
    );
  }

  function openScheduleDate() {
    setScheduleDate(
      activeRelease?.release_at
        ? new Date(activeRelease.release_at).toISOString().slice(0, 16)
        : '',
    );
    setScheduleDateOpen(true);
  }

  return (
    <>
      <div className="px-8 pt-0 pb-0 flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => onActiveReleaseChange(null)}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeReleaseId === null
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Current
        </button>

        <ReleaseDropdown
          releases={releases}
          unreleased={unreleased}
          activeReleaseId={activeReleaseId}
          activeRelease={activeRelease}
          releasesLoading={releasesLoading}
          showReleasesDropdown={showReleasesDropdown}
          releaseSearch={releaseSearch}
          onToggleDropdown={() => setShowReleasesDropdown((v) => !v)}
          onCloseDropdown={() => setShowReleasesDropdown(false)}
          onSearchChange={setReleaseSearch}
          onSelectRelease={onActiveReleaseChange}
          onEditRelease={handleOpenReleaseDetail}
          onCreateRelease={openCreateRelease}
        />

        <button
          onClick={openCreateRelease}
          title="New release"
          className="ml-1 p-1.5 text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors -mb-px"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {activeRelease && (
        <ReleaseActionBar
          activeRelease={activeRelease}
          showReleaseContentOnly={showReleaseContentOnly}
          onShowReleaseContentOnlyChange={onShowReleaseContentOnlyChange}
          scheduleDateOpen={scheduleDateOpen}
          scheduleDate={scheduleDate}
          onOpenScheduleDate={openScheduleDate}
          onScheduleDateChange={setScheduleDate}
          onCloseScheduleDate={() => setScheduleDateOpen(false)}
          onSaveScheduleDate={() =>
            actions.saveScheduleDate(activeRelease, scheduleDate, setScheduleDateOpen)
          }
          onEditRelease={() => handleOpenReleaseDetail(activeRelease)}
          onDeleteRelease={() => {
            setReleaseToDelete(activeRelease);
            setDeleteReleaseOpen(true);
          }}
          onPublishRelease={() => setPublishReleaseOpen(true)}
        />
      )}

      <ReleaseFormSidebar
        open={releaseSidebarOpen}
        onClose={() => setReleaseSidebarOpen(false)}
        editingRelease={editingRelease}
        releaseName={releaseName}
        onReleaseNameChange={setReleaseName}
        releaseAt={releaseAt}
        onReleaseAtChange={setReleaseAt}
        saving={actions.saving}
        conflictInfo={actions.conflictInfo}
        onSave={() =>
          actions.saveRelease(editingRelease, releaseName, releaseAt, setReleaseSidebarOpen)
        }
        onDelete={() => {
          if (editingRelease) {
            setReleaseToDelete(editingRelease);
            setDeleteReleaseOpen(true);
          }
        }}
        onPublish={() => setPublishReleaseOpen(true)}
      />

      <ConfirmModal
        open={deleteReleaseOpen}
        title="Delete Release"
        message={`Are you sure you want to delete release "${releaseToDelete?.name}"? This will remove all story changes in this release.`}
        confirmLabel="Delete"
        dangerous
        onConfirm={() =>
          actions.confirmDeleteRelease(releaseToDelete, setDeleteReleaseOpen, setReleaseSidebarOpen)
        }
        onCancel={() => setDeleteReleaseOpen(false)}
      />

      <ConfirmModal
        open={publishReleaseOpen}
        title="Publish Release"
        message={`Publish "${(editingRelease ?? activeRelease)?.name}"? All story changes in this release will go live immediately.`}
        confirmLabel="Publish"
        onConfirm={() =>
          actions.publishRelease(
            editingRelease ?? activeRelease,
            setPublishReleaseOpen,
            setReleaseSidebarOpen,
          )
        }
        onCancel={() => setPublishReleaseOpen(false)}
      />
    </>
  );
}
