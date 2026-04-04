'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  ChevronDown,
  GitBranch,
  AlertTriangle,
  Rocket,
  SquarePen,
  CalendarDays,
  Search,
  Trash2,
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { RightSidebar } from '@/components/ui/right-sidebar';
import { SkeletonText } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/date';
import { useApi } from '@/lib/swr';

export type Release = {
  id: number;
  name: string;
  uuid: string;
  release_at: string | null;
  released: boolean;
  created_at: string;
};

interface ReleaseSwitcherProps {
  spaceId: string;
  activeReleaseId: number | null;
  onActiveReleaseChange: (id: number | null) => void;
  showReleaseContentOnly: boolean;
  onShowReleaseContentOnlyChange: (value: boolean) => void;
  onReleasesChange?: (releases: Release[]) => void;
}

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

  // Sidebar (create / edit)
  const [releaseSidebarOpen, setReleaseSidebarOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState<Release | null>(null);
  const [releaseName, setReleaseName] = useState('');
  const [releaseAt, setReleaseAt] = useState('');
  const [releaseSaving, setReleaseSaving] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<{
    has_conflicts: boolean;
    conflicting_story_ids: number[];
  } | null>(null);

  // Confirm modals
  const [deleteReleaseOpen, setDeleteReleaseOpen] = useState(false);
  const [releaseToDelete, setReleaseToDelete] = useState<Release | null>(null);
  const [publishReleaseOpen, setPublishReleaseOpen] = useState(false);

  // Schedule date popover
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

  // Notify parent when releases list changes
  useEffect(() => {
    if (releasesData) onReleasesChange?.(releasesData.releases ?? []);
  }, [releasesData, onReleasesChange]);

  function openCreateRelease() {
    setEditingRelease(null);
    setReleaseName('');
    setReleaseAt('');
    setConflictInfo(null);
    setReleaseSidebarOpen(true);
  }

  async function openReleaseDetail(release: Release) {
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

  async function saveRelease() {
    setReleaseSaving(true);
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
      setReleaseSaving(false);
    }
  }

  async function publishRelease() {
    const target = editingRelease ?? activeRelease;
    if (!target) return;
    setReleaseSaving(true);
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
      setReleaseSaving(false);
    }
  }

  function openScheduleDate() {
    setScheduleDate(
      activeRelease?.release_at
        ? new Date(activeRelease.release_at).toISOString().slice(0, 16)
        : '',
    );
    setScheduleDateOpen(true);
  }

  async function saveScheduleDate() {
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

  async function confirmDeleteRelease() {
    if (!releaseToDelete) return;
    await fetch(`/api/admin/spaces/${spaceId}/releases/${releaseToDelete.id}`, {
      method: 'DELETE',
    });
    if (activeReleaseId === releaseToDelete.id) onActiveReleaseChange(null);
    setDeleteReleaseOpen(false);
    setReleaseSidebarOpen(false);
    await mutateReleases();
  }

  return (
    <>
      {/* Release tabs */}
      <div className="px-8 pt-0 pb-0 flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
        {/* Current tab */}
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

        {/* Releases dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowReleasesDropdown((v) => !v)}
            className={`flex items-center gap-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeReleaseId !== null
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {releasesLoading ? (
              <SkeletonText className="w-16 h-3" />
            ) : activeRelease ? (
              <span className="flex items-center gap-1">
                <GitBranch className="w-3.5 h-3.5" />
                {activeRelease.name}
              </span>
            ) : (
              <span>
                {unreleased.length} release{unreleased.length !== 1 ? 's' : ''}
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {showReleasesDropdown && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => {
                  setShowReleasesDropdown(false);
                  setReleaseSearch('');
                }}
              />
              <div className="absolute left-0 top-full mt-1 z-40 w-[420px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl flex flex-col max-h-[420px]">
                {/* Search */}
                <div className="p-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500 transition-colors">
                    <Search className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={releaseSearch}
                      onChange={(e) => setReleaseSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 outline-none"
                    />
                  </div>
                </div>

                {/* List */}
                <div className="overflow-y-auto flex-1">
                  {!releaseSearch && (
                    <div className="px-4 pt-3 pb-1">
                      <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                        {unreleased.length} release{unreleased.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {unreleased.length === 0 && !releasesLoading && (
                    <div className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">
                      No active releases
                    </div>
                  )}

                  {unreleased
                    .filter(
                      (r) =>
                        !releaseSearch ||
                        r.name.toLowerCase().includes(releaseSearch.toLowerCase()),
                    )
                    .map((release) => {
                      const scheduleLabel = release.release_at
                        ? formatDateTime(release.release_at)
                        : 'Not scheduled';
                      return (
                        <button
                          key={release.id}
                          onClick={() => {
                            onActiveReleaseChange(release.id);
                            setShowReleasesDropdown(false);
                            setReleaseSearch('');
                          }}
                          className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                            activeReleaseId === release.id ? 'bg-teal-50 dark:bg-teal-900/20' : ''
                          }`}
                        >
                          <div className="flex flex-col items-start min-w-0">
                            <span
                              className={`text-sm font-medium truncate ${activeReleaseId === release.id ? 'text-teal-700 dark:text-teal-300' : 'text-gray-800 dark:text-gray-200'}`}
                            >
                              {release.name}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              {scheduleLabel}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openReleaseDetail(release);
                              setShowReleasesDropdown(false);
                              setReleaseSearch('');
                            }}
                            className="ml-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
                            title="Edit release"
                          >
                            <SquarePen className="w-4 h-4" />
                          </button>
                        </button>
                      );
                    })}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 dark:border-gray-700/50 shrink-0">
                  <button
                    onClick={() => {
                      setShowReleasesDropdown(false);
                      setReleaseSearch('');
                      openCreateRelease();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> New release
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick create button */}
        <button
          onClick={openCreateRelease}
          title="New release"
          className="ml-1 p-1.5 text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors -mb-px"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Release action bar — shown when a release is selected */}
      {activeRelease && (
        <div className="px-8 pt-3 pb-0">
          <div className="flex items-center justify-between px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800/50">
            {/* Left: schedule / edit / delete */}
            <div className="flex items-center gap-1">
              <div className="relative">
                <button
                  onClick={openScheduleDate}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                  <CalendarDays className="w-4 h-4" />
                  {activeRelease.release_at
                    ? formatDateTime(activeRelease.release_at)
                    : 'Set scheduled date'}
                </button>
                {scheduleDateOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setScheduleDateOpen(false)}
                    />
                    <div className="absolute left-0 top-full mt-1 z-40 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                        Scheduled publish date
                      </label>
                      <input
                        type="datetime-local"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 mb-3"
                      />
                      <div className="flex gap-2 justify-end">
                        {scheduleDate && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setScheduleDate('');
                            }}
                            className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                          >
                            Clear
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setScheduleDateOpen(false);
                          }}
                          className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            saveScheduleDate();
                          }}
                          className="px-3 py-1.5 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => openReleaseDetail(activeRelease)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                title="Edit release"
              >
                <SquarePen className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setReleaseToDelete(activeRelease);
                  setDeleteReleaseOpen(true);
                }}
                className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                title="Delete release"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Right: show release content only + publish now */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showReleaseContentOnly}
                  onChange={(e) => onShowReleaseContentOnlyChange(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                Show release content only
              </label>
              <button
                onClick={() => setPublishReleaseOpen(true)}
                className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Publish now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Release sidebar */}
      <RightSidebar
        open={releaseSidebarOpen}
        onClose={() => setReleaseSidebarOpen(false)}
        header={
          <div>
            <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {editingRelease ? 'Edit Release' : 'New Release'}
            </div>
            {editingRelease && (
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {editingRelease.name}
              </div>
            )}
          </div>
        }
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-2">
              {editingRelease && (
                <button
                  onClick={() => {
                    setReleaseToDelete(editingRelease);
                    setDeleteReleaseOpen(true);
                  }}
                  className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Delete
                </button>
              )}
              {editingRelease && !editingRelease.released && (
                <button
                  onClick={() => setPublishReleaseOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                >
                  <Rocket className="w-3.5 h-3.5" /> Publish release
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setReleaseSidebarOpen(false)}
                className="px-4 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveRelease}
                disabled={releaseSaving || !releaseName.trim()}
                className="px-4 py-1.5 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {releaseSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={releaseName}
              onChange={(e) => setReleaseName(e.target.value)}
              placeholder="Release name"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Scheduled publish <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={releaseAt}
              onChange={(e) => setReleaseAt(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Conflict info */}
          {conflictInfo?.has_conflicts && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <strong>Conflicts detected.</strong> {conflictInfo.conflicting_story_ids.length}{' '}
                stor{conflictInfo.conflicting_story_ids.length === 1 ? 'y' : 'ies'} in this release
                also appear in other releases.
              </div>
            </div>
          )}
          {conflictInfo && !conflictInfo.has_conflicts && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
              <div className="text-sm text-green-700 dark:text-green-300">
                No conflicts detected.
              </div>
            </div>
          )}
        </div>
      </RightSidebar>

      {/* Confirm: delete release */}
      <ConfirmModal
        open={deleteReleaseOpen}
        title="Delete Release"
        message={`Are you sure you want to delete release "${releaseToDelete?.name}"? This will remove all story changes in this release.`}
        confirmLabel="Delete"
        dangerous
        onConfirm={confirmDeleteRelease}
        onCancel={() => setDeleteReleaseOpen(false)}
      />

      {/* Confirm: publish release */}
      <ConfirmModal
        open={publishReleaseOpen}
        title="Publish Release"
        message={`Publish "${(editingRelease ?? activeRelease)?.name}"? All story changes in this release will go live immediately.`}
        confirmLabel="Publish"
        onConfirm={publishRelease}
        onCancel={() => setPublishReleaseOpen(false)}
      />
    </>
  );
}
