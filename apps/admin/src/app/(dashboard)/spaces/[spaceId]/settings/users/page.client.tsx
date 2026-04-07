'use client';

import { useState, use } from 'react';
import { Plus, Users, UserCheck } from 'lucide-react';
import { UserAvatar } from '@/components/ui/user-avatar';
import { SkeletonAvatar, SkeletonText } from '@/components/ui/skeleton';
import type { SpaceRoleRef, Collaborator } from '@sbx/types';
import { RoleBadge } from '@/components/ui/role-badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { AddUserPanel } from '@/components/spaces/add-user-panel';
import { SearchBar } from '@/components/ui/search-bar';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { StatCard } from '@/components/ui/stat-card';
import { useApi } from '@/lib/swr';

export default function UsersPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params);

  const {
    data: colData,
    isLoading: colLoading,
    mutate: mutateCollaborators,
  } = useApi<any>(`/api/admin/spaces/${spaceId}/collaborators`);

  const {
    data: rolesData,
    isLoading: rolesLoading,
    mutate: mutateRoles,
  } = useApi<{ space_roles: { id: number; role: string }[] }>(`/api/admin/spaces/${spaceId}/roles`);

  const loading = colLoading || rolesLoading;

  const collaborators: Collaborator[] = colData?.collaborators ?? [];
  const roles: SpaceRoleRef[] = (rolesData?.space_roles ?? []).map((r) => ({
    id: r.id,
    role: r.role,
  }));

  const [search, setSearch] = useState('');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);

  function reload() {
    mutateCollaborators();
    mutateRoles();
  }

  const active = collaborators.filter((c) => !c.user.disabled);
  const filtered = collaborators.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.user.firstname.toLowerCase().includes(q) ||
      c.user.lastname.toLowerCase().includes(q) ||
      c.user.email.toLowerCase().includes(q)
    );
  });

  function getRoleLabel(c: Collaborator) {
    if (c.spaceRoleId) {
      const sr = roles.find((r) => r.id === c.spaceRoleId);
      return sr?.role ?? c.role;
    }
    return c.role;
  }

  async function handleToggleDisable(member: Collaborator) {
    setToggling(member.id);
    await fetch(`/api/admin/users/${member.userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disabled: !member.user.disabled }),
    });
    setToggling(null);
    reload();
  }

  async function handleRemove(member: Collaborator) {
    setRemoving(member.id);
    await fetch(`/api/admin/spaces/${spaceId}/collaborators/${member.id}`, { method: 'DELETE' });
    setRemoving(null);
    reload();
  }

  return (
    <div className="max-w-3xl px-10 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Users</h1>
        <button
          type="button"
          onClick={() => setShowAddPanel(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add new user
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-6">
        <StatCard label="Space Users" value={collaborators.length} icon={Users} loading={loading} />
        <StatCard label="Active Users" value={active.length} icon={UserCheck} loading={loading} />
      </div>

      {/* Tab */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-5">
        <div className="flex gap-6">
          <button
            type="button"
            className="pb-3 text-sm font-medium text-teal-700 dark:text-teal-400 border-b-2 border-teal-700 dark:border-teal-400"
          >
            Active ({loading ? '…' : active.length})
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search..." />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {['sk0', 'sk1', 'sk2', 'sk3', 'sk4'].map((id) => (
            <div
              key={id}
              className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800"
            >
              <SkeletonAvatar />
              <div className="flex-1 space-y-1.5">
                <SkeletonText className="w-40 h-3.5" />
                <SkeletonText className="w-56 h-3" />
              </div>
              <SkeletonText className="w-20 h-3.5" />
              <SkeletonText className="w-16 h-3.5" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Header row */}
          <div className="grid grid-cols-[1fr_140px_100px_40px] gap-4 px-0 pb-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Name
            </p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Role
            </p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Status
            </p>
            <span />
          </div>

          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No users found.</p>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-[1fr_140px_100px_40px] gap-4 items-center py-3 border-b border-gray-100 dark:border-gray-800"
              >
                {/* Name */}
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar name={`${c.user.firstname} ${c.user.lastname}`} src={c.user.avatar} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {c.user.firstname} {c.user.lastname}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {c.user.email}
                    </p>
                  </div>
                </div>

                {/* Role */}
                <div>
                  <RoleBadge role={getRoleLabel(c)} />
                </div>

                {/* Status */}
                <div>
                  <StatusBadge disabled={c.user.disabled} />
                </div>

                {/* Actions */}
                <div className="flex justify-end">
                  <DropdownMenu
                    items={[
                      {
                        label: c.user.disabled ? 'Enable user' : 'Disable user',
                        disabled: toggling === c.id,
                        onClick: () => handleToggleDisable(c),
                      },
                      {
                        label: removing === c.id ? 'Removing...' : 'Remove from space',
                        variant: 'danger',
                        disabled: removing === c.id,
                        onClick: () => handleRemove(c),
                      },
                    ]}
                  />
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* Add user panel */}
      {showAddPanel && (
        <AddUserPanel
          spaceId={spaceId}
          roles={roles}
          onClose={() => setShowAddPanel(false)}
          onAdded={reload}
        />
      )}
    </div>
  );
}
