'use client';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}

export function StatCard({ label, value, icon: Icon, loading }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {loading ? '—' : value}
        </p>
      </div>
    </div>
  );
}
