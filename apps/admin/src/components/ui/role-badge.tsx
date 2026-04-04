interface RoleBadgeProps {
  role: string;
}

/**
 * Badge for user roles in space membership lists.
 * Highlights owner/admin with teal pill, renders other roles as plain text.
 */
export function RoleBadge({ role }: RoleBadgeProps) {
  const isHighlighted = role === 'owner' || role === 'admin';
  if (isHighlighted) {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 capitalize">
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  }
  return <span className="text-sm text-gray-700 dark:text-gray-300">{role}</span>;
}
