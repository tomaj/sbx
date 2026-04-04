import type { ReactNode } from 'react';

interface SettingsSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
}

/**
 * Standard settings page section with a title, optional description, and bottom border.
 * Use `last:border-0 last:mb-0` classes are applied automatically via Tailwind.
 */
export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 pb-8 mb-8 last:border-0 last:mb-0">
      {title && (
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h2>
      )}
      {description ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{description}</p>
      ) : title ? (
        <div className="mb-5" />
      ) : null}
      {children}
    </div>
  );
}
