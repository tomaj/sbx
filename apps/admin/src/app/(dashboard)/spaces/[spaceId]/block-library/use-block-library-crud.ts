import { useApi } from '@/lib/swr';
import type { Block } from '@/components/block-library/block-list';
import type { ComponentGroup } from '@/components/block-library/group-tree';
import type { ComponentInternalTag } from '@/components/block-library/tags-view';

interface ComponentsResponse {
  components: Block[];
  component_groups: ComponentGroup[];
}

interface TagsResponse {
  internal_tags: ComponentInternalTag[];
}

interface UseBlockLibraryCrudOptions {
  isTagsView: boolean;
}

export function useBlockLibraryCrud(spaceId: string, options: UseBlockLibraryCrudOptions) {
  const { isTagsView } = options;

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
    await mutateComponents();
  }

  async function handleRenameGroup(groupId: number, newName: string) {
    const res = await fetch(`/api/admin/spaces/${spaceId}/component-groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    if (!res.ok) throw new Error('Failed to rename group');
    await mutateComponents();
  }

  async function handleDeleteGroup(groupId: number) {
    const res = await fetch(`/api/admin/spaces/${spaceId}/component-groups/${groupId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete group');
    await mutateComponents();
  }

  // ─── Bulk actions ──────────────────────────────────────────────────────────

  async function handleDuplicate(ids: Set<number>) {
    await Promise.all(
      [...ids].map((id) =>
        fetch(`/api/admin/spaces/${spaceId}/components/${id}/duplicate`, { method: 'POST' }),
      ),
    );
    await mutateComponents();
  }

  async function handleMoveToGroup(ids: Set<number>, targetUuid: string | null) {
    await Promise.all(
      [...ids].map((id) =>
        fetch(`/api/admin/spaces/${spaceId}/components/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ component_group_uuid: targetUuid }),
        }),
      ),
    );
    await mutateComponents();
  }

  async function handleDeleteBlocks(ids: Set<number>) {
    await Promise.all(
      [...ids].map((id) =>
        fetch(`/api/admin/spaces/${spaceId}/components/${id}`, { method: 'DELETE' }),
      ),
    );
    await mutateComponents();
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

  return {
    // Data
    componentsData,
    isLoading,
    mutateComponents,
    tagsData,
    tagsLoading,
    mutateTags,
    allBlocks,
    groups,
    tags,

    // Block CRUD
    handleCreateBlock,

    // Group CRUD
    handleCreateGroup,
    handleRenameGroup,
    handleDeleteGroup,

    // Bulk actions
    handleDuplicate,
    handleMoveToGroup,
    handleDeleteBlocks,

    // Tag CRUD
    handleCreateTag,
    handleRenameTag,
    handleDeleteTag,
  };
}
