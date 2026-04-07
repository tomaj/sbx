import type { Column } from '@/components/ui/data-table';
import { UserAvatar } from '@/components/ui/user-avatar';
import { SkeletonAvatar, SkeletonText } from '@/components/ui/skeleton';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { SpacesTooltip } from './spaces-tooltip';
import type { User } from '@sbx/types';

export function getUserColumns(opts: {
  openEdit: (user: User) => void;
  handleDisable: (user: User) => void;
}): Column<User>[] {
  const { openEdit, handleDisable } = opts;

  return [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      skeletonRender: () => (
        <div className="flex items-center gap-3">
          <SkeletonAvatar />
          <div className="space-y-1.5">
            <SkeletonText className="w-28 h-3.5" />
            <SkeletonText className="w-40 h-3" />
          </div>
        </div>
      ),
      render: (u) => (
        <div className="flex items-center gap-3">
          <UserAvatar name={u.name || `${u.firstname} ${u.lastname}`} src={u.avatar} size="md" />
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {u.firstname} {u.lastname}
            </p>
            <p className="text-xs text-gray-400">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      width: '120px',
      render: (u) =>
        u.role === 'admin' ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
            Admin
          </span>
        ) : (
          <span className="text-sm text-gray-600 dark:text-gray-400">Member</span>
        ),
    },
    {
      key: 'spaces',
      label: 'Spaces',
      width: '180px',
      render: (u) => <SpacesTooltip spaces={u.spaces} />,
    },
    {
      key: 'status',
      label: 'Status',
      width: '100px',
      render: (u) => (
        <span
          className={cn(
            'text-sm',
            !u.disabled ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400',
          )}
        >
          {u.disabled ? 'Disabled' : 'Active'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: '40px',
      render: (u) => (
        <DropdownMenu
          items={[
            {
              label: 'Edit',
              onClick: () => openEdit(u),
            },
            {
              label: u.disabled ? 'Enable' : 'Disable',
              variant: 'danger',
              onClick: () => handleDisable(u),
            },
          ]}
        />
      ),
    },
  ];
}
