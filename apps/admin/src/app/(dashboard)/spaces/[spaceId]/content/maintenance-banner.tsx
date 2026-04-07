import { AlertTriangle } from 'lucide-react';

interface MaintenanceBannerProps {
  onDisable: () => void;
}

export function MaintenanceBanner({ onDisable }: MaintenanceBannerProps) {
  return (
    <div className="flex items-center justify-between px-8 py-2.5 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          The maintenance mode is enabled. Only admins can edit content.
        </p>
      </div>
      <button
        type="button"
        onClick={onDisable}
        className="text-sm font-medium text-amber-800 dark:text-amber-200 underline underline-offset-2 hover:no-underline shrink-0"
      >
        Disable maintenance mode
      </button>
    </div>
  );
}
