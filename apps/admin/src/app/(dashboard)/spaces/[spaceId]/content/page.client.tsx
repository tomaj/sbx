'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { usePerPage } from '@/hooks/use-per-page';
import { useApi } from '@/lib/swr';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Settings, Move, Files, Eye, EyeOff, Trash2, CalendarDays } from 'lucide-react';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { Pagination } from '@/components/ui/pagination';
import { BulkActionBar } from '@/components/ui/bulk-action-bar';
import { type ActiveFilter } from '@/components/ui/search-filter-bar';
import { StoryList, type Story, type StoryUser } from '@/components/stories/story-list';
import { CreateStoryPanel, CreateFolderPanel } from '@/components/stories/create-story-panel';
import { ReleaseSwitcher, type Release } from '@/components/stories/releases';
import { BranchSwitcher, type Branch } from '@/components/stories/branch-switcher';
import { StoryFiltersBar, type BreadcrumbEntry } from '@/components/stories/story-filters-bar';
import { CreateNewMenu } from './create-new-menu';
import { useContentActions } from './use-content-actions';
import { MaintenanceBanner } from './maintenance-banner';

function parseSortOption(sort: string): { field: string; dir: string } {
  const last = sort.lastIndexOf('_');
  return { field: sort.slice(0, last), dir: sort.slice(last + 1) };
}

const KNOWN_FILTER_KEYS: Record<string, { label: string; type: 'select' | 'text' }> = {
  content_type: { label: 'Content Type', type: 'select' },
  tag: { label: 'Tag', type: 'select' },
  block: { label: 'Blocks', type: 'select' },
  published: { label: 'Published', type: 'select' },
};

// Sync activeFilters ↔ URL params
function filtersToParams(filters: ActiveFilter[]): Record<string, string> {
  return Object.fromEntries(filters.filter((f) => f.value).map((f) => [f.key, f.value]));
}

function paramsToFilters(params: URLSearchParams): ActiveFilter[] {
  return Object.entries(KNOWN_FILTER_KEYS).flatMap(([key, def]) => {
    const val = params.get(key);
    if (!val) return [];
    return [{ key, label: def.label, type: def.type, value: val }];
  });
}

export default function ContentPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [_favoriteCount, setFavoriteCount] = useState(0);

  const { data: meData } = useApi<{ user: { id: number } }>('/api/admin/user/me');
  const currentUserId = meData?.user?.id ?? null;

  const { data: spaceData, mutate: mutateSpace } = useApi<{ space: { maintenance?: boolean } }>(
    `/api/admin/spaces/${spaceId}/space`,
  );
  const maintenanceMode = spaceData?.space?.maintenance ?? false;

  async function disableMaintenance() {
    await fetch(`/api/admin/spaces/${spaceId}/space`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maintenance: false }),
    });
    await mutateSpace();
  }

  // ─── Branches (pipeline switcher) ─────────────────────────────────────────
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);

  // ─── Releases ─────────────────────────────────────────────────────────────
  const releaseIdParam = searchParams.get('release_id');
  const [activeReleaseId, setActiveReleaseId] = useState<number | null>(() =>
    releaseIdParam ? parseInt(releaseIdParam, 10) : null,
  );
  const [showReleaseContentOnly, setShowReleaseContentOnly] = useState(false);
  const [releases, setReleases] = useState<Release[]>([]);

  // ─── Users map (for author avatars) ───────────────────────────────────────
  const { data: collaboratorsData } = useApi<{
    collaborators: {
      user: {
        id: number;
        friendly_name?: string;
        userid?: string;
        email?: string;
        avatar?: string | null;
      } | null;
    }[];
  }>(`/api/admin/spaces/${spaceId}/collaborators`);

  const usersMap = useMemo<Record<number, StoryUser>>(() => {
    const map: Record<number, StoryUser> = {};
    for (const c of collaboratorsData?.collaborators ?? []) {
      if (c.user) {
        map[c.user.id] = {
          name: c.user.friendly_name || c.user.userid || c.user.email || '?',
          avatar: c.user.avatar ?? null,
        };
      }
    }
    return map;
  }, [collaboratorsData]);

  // ─── Navigation — source of truth: URL ?parent_id=X ──────────────────────
  const parentIdParam = searchParams.get('parent_id');
  const currentParentId = parentIdParam ? parseInt(parentIdParam, 10) : null;

  const { data: breadcrumbsData } = useApi<{ breadcrumbs: Story[] }>(
    currentParentId
      ? `/api/admin/spaces/${spaceId}/breadcrumbs?currentPage=1&parent_id=${currentParentId}`
      : null,
  );

  const breadcrumb: BreadcrumbEntry[] = useMemo(
    () => (breadcrumbsData?.breadcrumbs ?? []).map((s) => ({ id: s.id, name: s.name })),
    [breadcrumbsData],
  );

  // ─── Search / sort / filters — initialised from URL ───────────────────────
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [sort, setSort] = useState(() => searchParams.get('sort') ?? 'position_asc');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>(() =>
    paramsToFilters(searchParams),
  );

  // ─── Persist search / sort / filters → URL ────────────────────────────────
  useEffect(() => {
    const p = new URLSearchParams(searchParams.toString());
    if (search) p.set('search', search);
    else p.delete('search');
    if (sort !== 'position_asc') p.set('sort', sort);
    else p.delete('sort');
    for (const key of Object.keys(KNOWN_FILTER_KEYS)) p.delete(key);
    for (const [k, v] of Object.entries(filtersToParams(activeFilters))) p.set(k, v);
    router.replace(`?${p}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sort, activeFilters, searchParams.toString, router.replace]);

  // ─── Pagination ───────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = usePerPage('perPage:stories', 25);

  // ─── Selection ────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteOpen, setDeleteOpen] = useState(false);

  // ─── Create new ───────────────────────────────────────────────────────────
  const [createStoryOpen, setCreateStoryOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);

  // ─── Build stories URL ────────────────────────────────────────────────────
  const storiesUrl = useMemo(() => {
    const qs = new URLSearchParams();

    if (activeReleaseId !== null && showReleaseContentOnly) {
      qs.set('page', String(page));
      qs.set('per_page', String(perPage));
      if (search.trim()) qs.set('text_search', search.trim());
      qs.set('in_release', String(activeReleaseId));
      const { field, dir } = parseSortOption(sort);
      qs.set('sort_by', `${field}:${dir}`);
    } else {
      qs.set('page', String(page));
      qs.set('per_page', String(perPage));
      qs.set('with_summary', '1');
      if (search.trim()) qs.set('text_search', search.trim());
      if (!search.trim() && !showFavoritesOnly) {
        qs.set('with_parent', currentParentId !== null ? String(currentParentId) : '0');
        if (currentParentId !== null) qs.set('in_current_folder', 'true');
      }
      const { field, dir } = parseSortOption(sort);
      qs.set('sort_by', `${field}:${dir}`);
      for (const f of activeFilters) {
        if (f.value) qs.set(f.key, f.value);
      }
      if (showFavoritesOnly && currentUserId !== null) {
        qs.set('favourite_of', String(currentUserId));
      }
    }

    return `/api/admin/spaces/${spaceId}/stories?${qs}`;
  }, [
    spaceId,
    page,
    perPage,
    search,
    sort,
    activeFilters,
    currentParentId,
    activeReleaseId,
    showFavoritesOnly,
    showReleaseContentOnly,
    currentUserId,
  ]);

  // ─── Load stories ─────────────────────────────────────────────────────────
  const {
    data: storiesData,
    isLoading,
    mutate: mutateStories,
  } = useApi<{ stories: Story[]; total: number }>(storiesUrl);

  const stories = storiesData?.stories ?? [];
  const total = storiesData?.total ?? 0;

  // ─── Local stories state for optimistic updates ───────────────────────────
  const [localStories, setLocalStories] = useState<Story[] | null>(null);
  const displayStories = localStories ?? stories;

  // Reset local stories when SWR data updates
  useEffect(() => {
    setLocalStories(null);
  }, []);

  // ─── Navigation ──────────────────────────────────────────────────────────
  function navigateInto(story: Story) {
    const p = new URLSearchParams(searchParams.toString());
    p.set('parent_id', String(story.id));
    router.push(`?${p}`);
  }

  function openStory(story: Story) {
    const base = `/spaces/${spaceId}/content/${story.id}`;
    router.push(activeReleaseId !== null ? `${base}?release_id=${activeReleaseId}` : base);
  }

  function navigateTo(index: number) {
    const p = new URLSearchParams(searchParams.toString());
    if (index < 0) p.delete('parent_id');
    else p.set('parent_id', String(breadcrumb[index].id));
    router.push(`?${p}`);
  }

  // ─── Bulk actions + favorite toggle ────────────────────────────────────────
  const { handlePublish, handleUnpublish, handleDelete, handleToggleFavorite, actionLoading } =
    useContentActions(
      spaceId,
      selectedIds,
      currentUserId,
      displayStories,
      () => {
        setSelectedIds(new Set());
        mutateStories();
      },
      setLocalStories,
    );

  async function handleDeleteWithClose() {
    await handleDelete();
    setDeleteOpen(false);
  }

  const _hasSelection = selectedIds.size > 0;
  const singleSelected = selectedIds.size === 1;

  const spaceIdNum = parseInt(spaceId, 10);
  const activeRelease = releases.find((r) => r.id === activeReleaseId) ?? null;

  return (
    <div className="flex flex-col h-full">
      {/* Maintenance mode banner */}
      {maintenanceMode && <MaintenanceBanner onDisable={disableMaintenance} />}
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Content</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/spaces/${spaceId}/content/planner`}
            className="flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <CalendarDays className="w-4 h-4" />
            Content Planner
          </Link>
          <CreateNewMenu
            onCreateStory={() => setCreateStoryOpen(true)}
            onCreateFolder={() => setCreateFolderOpen(true)}
          />
        </div>
      </div>

      {/* Preview / Branch switcher */}
      <BranchSwitcher spaceId={spaceId} onActiveBranchChange={setActiveBranch} />

      <ReleaseSwitcher
        spaceId={spaceId}
        activeReleaseId={activeReleaseId}
        onActiveReleaseChange={setActiveReleaseId}
        showReleaseContentOnly={showReleaseContentOnly}
        onShowReleaseContentOnlyChange={setShowReleaseContentOnly}
        onReleasesChange={setReleases}
      />

      <StoryFiltersBar
        spaceId={spaceId}
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
        activeFilters={activeFilters}
        onFiltersChange={setActiveFilters}
        showFavoritesOnly={showFavoritesOnly}
        onShowFavoritesOnlyChange={setShowFavoritesOnly}
        activeReleaseId={activeReleaseId}
        activeReleaseName={activeRelease?.name ?? null}
        activeBranchName={activeBranch?.name ?? null}
        breadcrumb={breadcrumb}
        onNavigateBreadcrumb={navigateTo}
      />

      {/* Story list */}
      <div className="flex-1 overflow-y-auto px-8 pb-4">
        <StoryList
          stories={displayStories}
          usersMap={usersMap}
          isLoading={isLoading}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onNavigate={navigateInto}
          onOpen={openStory}
          spaceId={spaceIdNum}
          currentUserId={currentUserId ?? undefined}
          showFavoritesOnly={showFavoritesOnly}
          onFavoriteCountChange={setFavoriteCount}
          onToggleFavorite={handleToggleFavorite}
          showReleaseContentOnly={showReleaseContentOnly}
          releasesMap={Object.fromEntries(releases.map((r) => [r.id, r.name]))}
        />
      </div>

      {/* Pagination — hidden in favorites mode */}
      {!showFavoritesOnly && (
        <Pagination
          total={total}
          page={page}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={(n) => {
            setPerPage(n);
            setPage(1);
          }}
          storageKey="perPage:stories"
        />
      )}

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        actions={[
          ...(singleSelected
            ? [{ label: 'Settings', icon: <Settings className="w-4 h-4" />, onClick: () => {} }]
            : []),
          { label: 'Move', icon: <Move className="w-4 h-4" />, onClick: () => {} },
          { label: 'Duplicate', icon: <Files className="w-4 h-4" />, onClick: () => {} },
          {
            label: 'Publish',
            icon: <Eye className="w-4 h-4" />,
            onClick: handlePublish,
            disabled: actionLoading,
          },
          {
            label: 'Unpublish',
            icon: <EyeOff className="w-4 h-4" />,
            onClick: handleUnpublish,
            disabled: actionLoading,
          },
          {
            label: 'Delete',
            icon: <Trash2 className="w-4 h-4" />,
            onClick: () => setDeleteOpen(true),
            variant: 'danger',
            disabled: actionLoading,
          },
        ]}
      />

      <ConfirmModal
        open={deleteOpen}
        title="Delete Stories"
        message={`Are you sure you want to delete ${selectedIds.size} stor${selectedIds.size === 1 ? 'y' : 'ies'}? This action cannot be undone.`}
        confirmLabel="Delete"
        dangerous
        onConfirm={handleDeleteWithClose}
        onCancel={() => setDeleteOpen(false)}
      />

      {/* Create story/folder panels */}
      <CreateStoryPanel
        spaceId={spaceId}
        open={createStoryOpen}
        defaultParentId={currentParentId}
        onClose={() => setCreateStoryOpen(false)}
        onCreated={(storyId) => {
          setCreateStoryOpen(false);
          mutateStories();
          router.push(`/spaces/${spaceId}/content/${storyId}`);
        }}
      />
      <CreateFolderPanel
        spaceId={spaceId}
        open={createFolderOpen}
        defaultParentId={currentParentId}
        onClose={() => setCreateFolderOpen(false)}
        onCreated={() => {
          setCreateFolderOpen(false);
          mutateStories();
        }}
      />
    </div>
  );
}
