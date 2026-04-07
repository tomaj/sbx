'use client';

import { type WorkingField } from '../../types';
import { SectionTitle } from '../form-primitives';

export function GroupOptions({
  def,
  allFields,
  currentKey,
  onChange,
}: {
  def: any;
  allFields: WorkingField[];
  currentKey: string;
  onChange: (patch: any) => void;
}) {
  const selectedKeys: string[] = def.keys ?? [];
  const availableFields = allFields.filter((f) => f.key !== currentKey && f.def.type !== 'tab');

  function toggle(key: string) {
    if (selectedKeys.includes(key)) {
      onChange({ keys: selectedKeys.filter((k) => k !== key) });
    } else {
      onChange({ keys: [...selectedKeys, key] });
    }
  }

  return (
    <>
      <SectionTitle>Group contains these fields</SectionTitle>
      {availableFields.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No other fields available</p>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {availableFields.map((f) => (
            <label
              key={f.key}
              className="flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <input
                type="checkbox"
                checked={selectedKeys.includes(f.key)}
                onChange={() => toggle(f.key)}
                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{f.key}</span>
              {f.def.display_name && (
                <span className="text-xs text-gray-400">({f.def.display_name})</span>
              )}
            </label>
          ))}
        </div>
      )}
    </>
  );
}
