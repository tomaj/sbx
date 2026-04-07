'use client';

export function PresetFieldRow({
  fieldKey,
  type,
  displayName,
  value,
  onChange,
}: {
  fieldKey: string;
  type: string;
  displayName: string;
  value: any;
  onChange: (v: any) => void;
}) {
  switch (type) {
    case 'text':
    case 'textarea':
    case 'markdown':
      return (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {displayName} <span className="text-gray-300">({type})</span>
          </label>
          {type === 'textarea' || type === 'markdown' ? (
            <textarea
              value={value ?? ''}
              onChange={(e) => onChange(e.target.value)}
              rows={2}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          ) : (
            <input
              type="text"
              value={value ?? ''}
              onChange={(e) => onChange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          )}
        </div>
      );
    case 'number':
      return (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {displayName} <span className="text-gray-300">({type})</span>
          </label>
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      );
    case 'boolean':
      return (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {displayName} <span className="text-gray-300">({type})</span>
          </label>
        </div>
      );
    case 'datetime':
      return (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {displayName} <span className="text-gray-300">({type})</span>
          </label>
          <input
            type="datetime-local"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      );
    default:
      // For complex types (bloks, richtext, asset, option, etc.) — show JSON
      return (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {displayName} <span className="text-gray-300">({type})</span>
          </label>
          <input
            type="text"
            value={typeof value === 'object' ? JSON.stringify(value ?? '') : (value ?? '')}
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {
                onChange(e.target.value);
              }
            }}
            placeholder="Value or JSON"
            className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      );
  }
}
