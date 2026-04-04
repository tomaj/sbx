'use client';

import { useState, use, useRef, useEffect } from 'react';
import { Plus, Search, MoreHorizontal } from 'lucide-react';
import { UserAvatar } from '@/components/ui/user-avatar';
import { SkeletonAvatar, SkeletonText } from '@/components/ui/skeleton';
import type { SpaceRoleRef, Collaborator } from '@sbx/types';
import { RoleBadge } from '@/components/ui/role-badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { AddUserPanel } from '@/components/spaces/add-user-panel';
import { useApi } from '@/lib/swr';

function MemberMenu({
  member,
  spaceId,
  onUpdated,
}: {
  member: Collaborator;
  spaceId: string;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleRemove() {
    setRemoving(true);
    await fetch(`/api/admin/spaces/${spaceId}/collaborators/${member.id}`, { method: 'DELETE' });
    setRemoving(false);
    setOpen(false);
    onUpdated();
  }

  async function handleToggleDisable() {
    setToggling(true);
    await fetch(`/api/admin/users/${member.userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disabled: !member.user.disabled }),
    });
    setToggling(false);
    setOpen(false);
    onUpdated();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
          <button
            onClick={handleToggleDisable}
            disabled={toggling}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {member.user.disabled ? 'Enable user' : 'Disable user'}
          </button>
          <button
            onClick={handleRemove}
            disabled={removing}
            className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
          >
            {removing ? 'Removing...' : 'Remove from space'}
          </button>
        </div>
      )}
    </div>
  );
}

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
  } = useApi<any>(`/api/admin/spaces/${spaceId}/roles`);

  const loading = colLoading || rolesLoading;

  const collaborators: Collaborator[] = colData?.collaborators ?? [];
  const roles: SpaceRoleRef[] = (rolesData?.space_roles ?? []).map((r: any) => ({
    id: r.id,
    role: r.role,
  }));

  const [search, setSearch] = useState('');
  const [showAddPanel, setShowAddPanel] = useState(false);

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

  return (
    <div className="max-w-3xl px-10 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Users</h1>
        <button
          onClick={() => setShowAddPanel(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add new user
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-3 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Space Users</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {loading ? '—' : collaborators.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Active Users</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {loading ? '—' : active.length}
            </p>
          </div>
        </div>
      </div>

      {/* Tab */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-5">
        <div className="flex gap-6">
          <button className="pb-3 text-sm font-medium text-teal-700 dark:text-teal-400 border-b-2 border-teal-700 dark:border-teal-400">
            Active ({loading ? '…' : active.length})
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
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
                  <MemberMenu member={c} spaceId={spaceId} onUpdated={reload} />
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
