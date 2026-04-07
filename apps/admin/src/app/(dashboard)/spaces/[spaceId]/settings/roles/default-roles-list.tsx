'use client';

const DEFAULT_ROLES: { role: string; subtitle: string }[] = [
  { role: 'Admin', subtitle: 'Can manage users and create, update projects.' },
  { role: 'Editor', subtitle: 'Can create, update and delete content.' },
];

export { DEFAULT_ROLES };

export function DefaultRoleRow({
  role,
  userCount,
}: {
  role: (typeof DEFAULT_ROLES)[0];
  userCount: number;
}) {
  return (
    <div className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{role.role}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium">
            Default role
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{role.subtitle}</p>
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400 shrink-0 w-28 text-right">
        {userCount} user{userCount !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
