'use client';

import { useState, use } from 'react';
import { Plus, Settings, Trash2 } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { PageLayout } from '@/components/ui/page-layout';
import { useApi } from '@/lib/swr';
import { useDelete } from '@/hooks/use-delete';
import type { SpaceRole } from '@sbx/types';
import { SkeletonText, SkeletonBadge } from '@/components/ui/skeleton';
import { DEFAULT_ROLES, DefaultRoleRow } from './default-roles-list';
import { CustomRoleForm } from './custom-role-form';

interface DefaultRole {
  role: string;
  subtitle: string;
  user_count: number;
}

interface CustomRoleRowProps {
  role: SpaceRole;
  onEdit: () => void;
  onDelete: () => void;
}

function CustomRoleRow({ role, onEdit, onDelete }: CustomRoleRowProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{role.role}</p>
        {role.subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{role.subtitle}</p>
        )}
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400 shrink-0 w-28 text-right">
        {role.user_count} user{role.user_count !== 1 ? 's' : ''}
      </div>
      <div
        className={`flex items-center gap-1 ml-2 transition-opacity duration-150 ${hovered ? 'opacity-100' : 'opacity-0'}`}
      >
        <IconButton icon={Settings} onClick={onEdit} title="Edit" />
        <IconButton icon={Trash2} onClick={onDelete} title="Delete" variant="danger" />
      </div>
    </div>
  );
}

interface RolesApiResponse {
  default_roles: DefaultRole[];
  space_roles: SpaceRole[];
}

export default function RolesPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params);
  const [selectedRole, setSelectedRole] = useState<SpaceRole | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const {
    data,
    isLoading: loading,
    mutate,
  } = useApi<RolesApiResponse>(`/api/admin/spaces/${spaceId}/roles`);

  const roleDelete = useDelete<SpaceRole>({
    getUrl: (r) => `/api/admin/spaces/${spaceId}/roles/${r.id}`,
    onSuccess: () => mutate(),
    title: 'Delete Role',
    getMessage: (r) =>
      `Are you sure you want to delete the role "${r.role}"? Users with this role will lose these permissions.`,
  });

  const defaultRoleCounts: Record<string, number> = { Admin: 0, Editor: 0 };
  for (const dr of data?.default_roles ?? []) {
    defaultRoleCounts[dr.role] = dr.user_count ?? 0;
  }
  const spaceRoles = data?.space_roles ?? [];

  function openNew() {
    setSelectedRole(null);
    setPanelOpen(true);
  }
  function openEdit(r: SpaceRole) {
    setSelectedRole(r);
    setPanelOpen(true);
  }

  return (
    <PageLayout
      title="Roles"
      description="Roles are for giving certain permissions to various types of users in your space. It gives the space owner and admins greater control over who can publish what, especially for bigger projects."
      action={
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add new role
        </button>
      }
    >
      {/* Table header */}
      <div className="flex items-center px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        <div className="flex-1">Name</div>
        <div className="w-28 text-right mr-10">Users</div>
      </div>

      {loading ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          {['sk0', 'sk1', 'sk2', 'sk3', 'sk4'].map((id, i) => (
            <div
              key={id}
              className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <SkeletonText width="w-32" />
                  {i < 2 && <SkeletonText width="w-20" />}
                </div>
                <SkeletonText width="w-48" height="h-3" />
              </div>
              <SkeletonBadge width="w-14" />
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          {/* Default roles always shown */}
          {DEFAULT_ROLES.map((r) => (
            <DefaultRoleRow key={r.role} role={r} userCount={defaultRoleCounts[r.role] ?? 0} />
          ))}

          {/* Custom roles */}
          {spaceRoles.map((r) => (
            <CustomRoleRow
              key={r.id}
              role={r}
              onEdit={() => openEdit(r)}
              onDelete={() => roleDelete.confirm(r)}
            />
          ))}

          {spaceRoles.length === 0 && (
            <div className="py-8 text-center border-t border-gray-100 dark:border-gray-800">
              <p className="text-sm text-gray-400">No custom roles yet.</p>
              <button
                type="button"
                onClick={openNew}
                className="mt-2 text-sm text-teal-600 dark:text-teal-400 hover:underline"
              >
                Add your first role
              </button>
            </div>
          )}
        </div>
      )}

      <CustomRoleForm
        spaceId={spaceId}
        role={selectedRole}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onSaved={() => {
          setPanelOpen(false);
          mutate();
        }}
      />

      {roleDelete.modal}
    </PageLayout>
  );
}
