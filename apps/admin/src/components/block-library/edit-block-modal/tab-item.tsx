interface TabItemProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export function TabItem({ label, active, onClick }: TabItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
        active
          ? 'border-teal-600 text-teal-600 dark:text-teal-400 dark:border-teal-400'
          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
      }`}
    >
      {label}
    </button>
  );
}
