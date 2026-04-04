import type { ReactNode } from 'react';

interface EmptyStateProps {
  message: string;
  /** Optional call-to-action — typically a <button> or <Link> */
  action?: ReactNode;
}

/**
 * Dashed-border empty state used in list pages when there are no items.
 *
 * Usage:
 *   <EmptyState
 *     message="No webhooks configured yet."
 *     action={<button onClick={openNew} className="text-sm text-teal-600 hover:underline">Add your first webhook</button>}
 *   />
 */
export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
      <p className="text-sm text-gray-400 mb-3">{message}</p>
      {action}
    </div>
  );
}
