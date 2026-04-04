'use client';

import { useState, useMemo, use } from 'react';
import { usePerPage } from '@/hooks/use-per-page';
import { FolderPlus, Plus, Search, Trash2, Move, Files } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { GroupTree, type ComponentGroup } from '@/components/block-library/group-tree';
import { CreateGroupModal } from '@/components/block-library/create-group-modal';
import { CreateBlockModal } from '@/components/block-library/create-block-modal';
import { BlockList, type Block } from '@/components/block-library/block-list';
import { EditBlockModal } from '@/components/block-library/edit-block-modal';
import { TagsView, type ComponentInternalTag } from '@/components/block-library/tags-view';
import type { SortOption } from '@/components/ui/search-filter-bar';
import { SelectDropdown } from '@/components/ui/select-dropdown';
import { RenameModal } from '@/components/ui/rename-modal';
import { BulkActionBar } from '@/components/ui/bulk-action-bar';
import { SplitPageLayout } from '@/components/ui/split-page-layout';
import { useApi } from '@/lib/swr';

const SORT_OPTIONS: SortOption[] = [
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'updated_at', label: 'Updated (newest)' },
];

interface ComponentsResponse {
  components: Block[];
  component_groups: ComponentGroup[];
}

interface TagsResponse {
  internal_tags: ComponentInternalTag[];
}

export default function BlockLibraryPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params);

  // ─── UI state ──────────────────────────────────────────────────────────────
  const [selectedGroupUuid, setSelectedGroupUuid] = useState<string | null>(null);

  // ─── Search / sort ─────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');

  // ─── Pagination ────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = usePerPage('perPage:blocks', 25);

  // ─── Block modals ──────────────────────────────────────────────────────────
  const [createBlockOpen, setCreateBlockOpen] = useState(false);
  const [editBlock, setEditBlock] = useState<Block | null>(null);

  // ─── Group modals ──────────────────────────────────────────────────────────
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [renameGroup, setRenameGroup] = useState<ComponentGroup | null>(null);
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<ComponentGroup | null>(null);

  // ─── Tags view ─────────────────────────────────────────────────────────────
  const [isTagsView, setIsTagsView] = useState(false);

  // ─── Multiselect ───────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteBlocksOpen, setDeleteBlocksOpen] = useState(false);
  const [moveGroupOpen, setMoveGroupOpen] = useState(false);
  const [moveTargetUuid, setMoveTargetUuid] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ─── Data fetching ─────────────────────────────────────────────────────────
  const {
    data: componentsData,
    isLoading,
    mutate: mutateComponents,
  } = useApi<ComponentsResponse>(`/api/admin/spaces/${spaceId}/components`);

  const allBlocks = componentsData?.components ?? [];
  const groups = componentsData?.component_groups ?? [];

  const {
    data: tagsData,
    isLoading: tagsLoading,
    mutate: mutateTags,
  } = useApi<TagsResponse>(
    isTagsView ? `/api/admin/spaces/${spaceId}/internal_tags?by_object_type=component` : null,
  );

  const tags = tagsData?.internal_tags ?? [];

  // ─── Client-side counts (derived from allBlocks) ───────────────────────────
  const counts = useMemo(() => {
    const byGroup: Record<string, number> = {};
    let total = 0;
    for (const b of allBlocks) {
      total++;
      if (b.component_group_uuid) {
        byGroup[b.component_group_uuid] = (byGroup[b.component_group_uuid] ?? 0) + 1;
      }
    }
    return { total, by_group: byGroup };
  }, [allBlocks]);

  // ─── Client-side filter / sort / paginate ─────────────────────────────────
  const filtered = useMemo(() => {
    let result = allBlocks;

    if (selectedGroupUuid !== null) {
      result = result.filter((b) => b.component_group_uuid === selectedGroupUuid);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (b) => b.name.toLowerCase().includes(q) || (b.display_name ?? '').toLowerCase().includes(q),
      );
    }

    if (sort === 'updated_at') {
      result = [...result].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
    } else {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [allBlocks, selectedGroupUuid, search, sort]);

  const total = filtered.length;
  const pageBlocks = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  // ─── Block CRUD ────────────────────────────────────────────────────────────

  async function handleCreateBlock(data: {
    name: string;
    description: string;
    is_nestable: boolean;
    is_root: boolean;
    component_group_uuid: string | null;
  }) {
    const res = await fetch(`/api/admin/spaces/${spaceId}/components`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message ?? 'Failed to create block');
    }
    setCreateBlockOpen(false);
    await mutateComponents();
  }

  // ─── Group CRUD ────────────────────────────────────────────────────────────

  async function handleCreateGroup(name: string) {
    const res = await fetch(`/api/admin/spaces/${spaceId}/component-groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message ?? 'Failed to create group');
    }
    setCreateGroupOpen(false);
    await mutateComponents();
  }

  async function handleRenameGroup(newName: string) {
    if (!renameGroup) return;
    const res = await fetch(`/api/admin/spaces/${spaceId}/component-groups/${renameGroup.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      setRenameGroup(null);
      await mutateComponents();
    }
  }

  async function handleDeleteGroup() {
    if (!deleteGroupTarget) return;
    const res = await fetch(
      `/api/admin/spaces/${spaceId}/component-groups/${deleteGroupTarget.id}`,
      {
        method: 'DELETE',
      },
    );
    if (res.ok) {
      if (selectedGroupUuid === deleteGroupTarget.uuid) setSelectedGroupUuid(null);
      setDeleteGroupTarget(null);
      await mutateComponents();
    }
  }

  // ─── Bulk actions ──────────────────────────────────────────────────────────

  async function handleDuplicate() {
    setActionLoading(true);
    try {
      await Promise.all(
        [...selectedIds].map((id) =>
          fetch(`/api/admin/spaces/${spaceId}/components/${id}/duplicate`, { method: 'POST' }),
        ),
      );
      setSelectedIds(new Set());
      await mutateComponents();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMove() {
    if (moveTargetUuid === undefined) return;
    setActionLoading(true);
    try {
      await Promise.all(
        [...selectedIds].map((id) =>
          fetch(`/api/admin/spaces/${spaceId}/components/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ component_group_uuid: moveTargetUuid }),
          }),
        ),
      );
      setSelectedIds(new Set());
      setMoveGroupOpen(false);
      await mutateComponents();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteBlocks() {
    setActionLoading(true);
    try {
      await Promise.all(
        [...selectedIds].map((id) =>
          fetch(`/api/admin/spaces/${spaceId}/components/${id}`, { method: 'DELETE' }),
        ),
      );
      setSelectedIds(new Set());
      setDeleteBlocksOpen(false);
      await mutateComponents();
    } finally {
      setActionLoading(false);
    }
  }

  // ─── Tag CRUD ──────────────────────────────────────────────────────────────

  async function handleCreateTag(name: string) {
    const res = await fetch(`/api/admin/spaces/${spaceId}/internal_tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, object_type: 'component' }),
    });
    if (!res.ok) throw new Error('Failed to create tag');
    await mutateTags();
  }

  async function handleRenameTag(tag: ComponentInternalTag, newName: string) {
    const res = await fetch(`/api/admin/spaces/${spaceId}/internal_tags/${tag.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    if (!res.ok) throw new Error('Failed to rename tag');
    await mutateTags();
  }

  async function handleDeleteTag(tag: ComponentInternalTag) {
    const res = await fetch(`/api/admin/spaces/${spaceId}/internal_tags/${tag.id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete tag');
    await mutateTags();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Block Library</h1>
        {!isTagsView && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCreateGroupOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              Create Group
            </button>
            <button
              onClick={() => setCreateBlockOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Block
            </button>
          </div>
        )}
      </div>

      {/* Body: sidebar + content */}
      <SplitPageLayout
        sidebar={
          <GroupTree
            groups={groups}
            selectedUuid={selectedGroupUuid}
            onSelect={(uuid) => {
              setIsTagsView(false);
              setSelectedGroupUuid(uuid);
            }}
            counts={counts}
            tagsCount={tags.length || undefined}
            isTagsView={isTagsView}
            onSelectTags={() => setIsTagsView(true)}
            onCreateGroup={() => setCreateGroupOpen(true)}
            onRenameGroup={setRenameGroup}
            onDeleteGroup={setDeleteGroupTarget}
          />
        }
      >
        {isTagsView ? (
          <TagsView
            tags={tags}
            isLoading={tagsLoading}
            onCreateTag={handleCreateTag}
            onRenameTag={handleRenameTag}
            onDeleteTag={handleDeleteTag}
          />
        ) : (
          <>
            {/* Toolbar */}
            <div className="px-6 pt-4 pb-3 flex items-center gap-3">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search blocks..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              {/* Sort */}
              <SelectDropdown
                value={sort}
                onChange={(v) => v && setSort(v)}
                options={SORT_OPTIONS}
                className="w-44"
              />
            </div>

            {/* Block listing */}
            <div className="flex-1 overflow-y-auto px-6 pb-4">
              <BlockList
                blocks={pageBlocks}
                groups={groups}
                isLoading={isLoading}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                onEdit={setEditBlock}
              />
            </div>

            {/* Pagination */}
            <Pagination
              total={total}
              page={page}
              perPage={perPage}
              onPageChange={setPage}
              onPerPageChange={(n) => {
                setPerPage(n);
                setPage(1);
              }}
              storageKey="perPage:blocks"
            />
          </>
        )}
      </SplitPageLayout>

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        actions={[
          {
            label: 'Duplicate',
            icon: <Files className="w-4 h-4" />,
            onClick: handleDuplicate,
            disabled: actionLoading,
          },
          {
            label: '',
            custom: (
              <CopyButton
                text={JSON.stringify(
                  pageBlocks
                    .filter((b) => selectedIds.has(b.id))
                    .map((b) => ({ name: b.name, display_name: b.display_name })),
                  null,
                  2,
                )}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-white/10 transition-colors"
              />
            ),
          },
          {
            label: 'Move',
            icon: <Move className="w-4 h-4" />,
            onClick: () => {
              setMoveTargetUuid(null);
              setMoveGroupOpen(true);
            },
            disabled: actionLoading,
          },
          {
            label: 'Delete',
            icon: <Trash2 className="w-4 h-4" />,
            onClick: () => setDeleteBlocksOpen(true),
            variant: 'danger',
            disabled: actionLoading,
          },
        ]}
      />

      {/* Edit block modal */}
      {editBlock && (
        <EditBlockModal
          open={!!editBlock}
          block={editBlock}
          spaceId={spaceId}
          groups={groups}
          onClose={() => setEditBlock(null)}
          onSaved={(updatedBlock) => {
            mutateComponents((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                components: prev.components.map((b) =>
                  b.id === updatedBlock.id ? updatedBlock : b,
                ),
              };
            }, false);
            setEditBlock(updatedBlock);
          }}
        />
      )}

      {/* Create block modal */}
      <CreateBlockModal
        open={createBlockOpen}
        groups={groups}
        onConfirm={handleCreateBlock}
        onCancel={() => setCreateBlockOpen(false)}
      />

      {/* Create group modal */}
      <CreateGroupModal
        open={createGroupOpen}
        onConfirm={handleCreateGroup}
        onCancel={() => setCreateGroupOpen(false)}
      />

      {/* Rename group modal */}
      <RenameModal
        open={!!renameGroup}
        title="Rename Group"
        currentName={renameGroup?.name ?? ''}
        onRename={handleRenameGroup}
        onClose={() => setRenameGroup(null)}
      />

      {/* Delete group confirm */}
      <ConfirmModal
        open={!!deleteGroupTarget}
        title="Delete Group"
        message={`Are you sure you want to delete "${deleteGroupTarget?.name}"? Blocks inside will not be deleted but will be ungrouped.`}
        confirmLabel="Delete"
        dangerous
        onConfirm={handleDeleteGroup}
        onCancel={() => setDeleteGroupTarget(null)}
      />

      {/* Delete blocks confirm */}
      <ConfirmModal
        open={deleteBlocksOpen}
        title="Delete Blocks"
        message={`Are you sure you want to delete ${selectedIds.size} block${selectedIds.size === 1 ? '' : 's'}? This action cannot be undone.`}
        confirmLabel="Delete"
        dangerous
        onConfirm={handleDeleteBlocks}
        onCancel={() => setDeleteBlocksOpen(false)}
      />

      {/* Move to group modal */}
      {moveGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMoveGroupOpen(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Move {selectedIds.size} block{selectedIds.size === 1 ? '' : 's'} to group
            </h2>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-y-auto max-h-64 mb-4">
              <button
                onClick={() => setMoveTargetUuid(null)}
                className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                  moveTargetUuid === null
                    ? 'bg-gray-100 dark:bg-gray-800 text-teal-600 dark:text-teal-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                No group
              </button>
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setMoveTargetUuid(g.uuid)}
                  className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                    moveTargetUuid === g.uuid
                      ? 'bg-gray-100 dark:bg-gray-800 text-teal-600 dark:text-teal-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setMoveGroupOpen(false)}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleMove}
                disabled={actionLoading}
                className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {actionLoading ? 'Moving...' : 'Move'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
