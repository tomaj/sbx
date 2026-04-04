import { Badge } from './badge';

interface StatusBadgeProps {
  disabled: boolean;
}

/**
 * Badge for user account status (Active / Disabled).
 */
export function StatusBadge({ disabled }: StatusBadgeProps) {
  if (disabled) return <Badge variant="danger">Disabled</Badge>;
  return <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>;
}
