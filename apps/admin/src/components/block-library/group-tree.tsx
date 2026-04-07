'use client';

import { LayoutTemplate, Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { TreeNav, type TreeNavItem, type TreeNavAction } from '@/components/ui/tree-nav';

export interface ComponentGroup {
  id: number;
  uuid: string;
  name: string;
  parent_id: number | null;
  parent_uuid: string | null;
}

interface ComponentGroupItem extends TreeNavItem {
  uuid: string;
  name: string;
  parent_id: number | null;
  parent_uuid: string | null;
  _numericId: number;
}

export interface GroupTreeProps {
  groups: ComponentGroup[];
  selectedUuid: string | null;
  onSelect: (uuid: string | null) => void;
  counts?: { total: number; by_group: Record<string, number> };
  tagsCount?: number;
  isTagsView: boolean;
  onSelectTags: () => void;
  onCreateGroup: (parentUuid?: string) => void;
  onRenameGroup: (group: ComponentGroup) => void;
  onDeleteGroup: (group: ComponentGroup) => void;
}

export function GroupTree({
  groups,
  selectedUuid,
  onSelect,
  counts,
  tagsCount,
  isTagsView,
  onSelectTags,
  onCreateGroup,
  onRenameGroup,
  onDeleteGroup,
}: GroupTreeProps) {
  const items: ComponentGroupItem[] = groups.map((g) => ({
    id: g.uuid,
    parentId: g.parent_uuid,
    label: g.name,
    count: counts?.by_group[g.uuid],
    uuid: g.uuid,
    name: g.name,
    parent_id: g.parent_id,
    parent_uuid: g.parent_uuid,
    _numericId: g.id,
  }));

  function toComponentGroup(item: ComponentGroupItem): ComponentGroup {
    return {
      id: item._numericId,
      uuid: item.uuid,
      name: item.name,
      parent_id: item.parent_id,
      parent_uuid: item.parent_uuid,
    };
  }

  const actions: TreeNavAction<ComponentGroupItem>[] = [
    {
      label: 'Create subgroup',
      icon: Plus,
      onClick: (item) => onCreateGroup(item.uuid),
    },
    {
      label: 'Rename',
      icon: Pencil,
      onClick: (item) => onRenameGroup(toComponentGroup(item)),
    },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: (item) => onDeleteGroup(toComponentGroup(item)),
      variant: 'danger',
    },
  ];

  return (
    <TreeNav<ComponentGroupItem>
      items={items}
      selectedId={isTagsView ? null : selectedUuid}
      onSelect={(id) => onSelect(id as string | null)}
      actions={actions}
      pinnedItems={[
        {
          id: 'all',
          label: 'All blocks',
          icon: LayoutTemplate,
          count: counts?.total,
          selected: !isTagsView && selectedUuid === null,
          onClick: () => onSelect(null),
        },
        {
          id: 'tags',
          label: 'Tags',
          icon: Tag,
          count: tagsCount,
          selected: isTagsView,
          onClick: onSelectTags,
        },
      ]}
      searchable={true}
      sectionLabel="Block folders"
    />
  );
}
