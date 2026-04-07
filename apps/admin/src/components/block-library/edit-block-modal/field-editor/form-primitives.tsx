'use client';

import { useState } from 'react';

export function FormRow({ children }: { children: React.ReactNode }) {
  return <div className="mb-4">{children}</div>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
      {children}
    </label>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold text-teal-600 dark:text-teal-400 mb-3 mt-5 pb-2 border-b border-gray-100 dark:border-gray-800">
      {children}
    </p>
  );
}

export function TooltipHint({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <div
      className="relative inline-flex flex-shrink-0"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <div className="w-4 h-4 rounded-full border border-gray-400 text-gray-400 text-[10px] flex items-center justify-center cursor-help select-none">
        ?
      </div>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-950 text-white text-xs rounded-lg shadow-xl z-50 pointer-events-none leading-relaxed">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-950" />
        </div>
      )}
    </div>
  );
}

export function CheckboxRow({
  label,
  checked,
  onChange,
  tooltip,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  tooltip?: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer mb-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
      />
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      {tooltip && <TooltipHint text={tooltip} />}
    </label>
  );
}

export function NumberStepper({
  value,
  onChange,
  min,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min?: number;
}) {
  const minVal = min ?? 0;
  return (
    <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden w-44">
      <button
        type="button"
        onClick={() => {
          const v = (value ?? 0) - 1;
          onChange(v < minVal ? undefined : v);
        }}
        className="px-3 py-2 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 border-r border-gray-200 dark:border-gray-700 text-sm font-medium flex-shrink-0"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={value ?? ''}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') {
            onChange(undefined);
            return;
          }
          const n = parseInt(raw, 10);
          if (!Number.isNaN(n)) onChange(n < minVal ? minVal : n);
        }}
        className="flex-1 text-center text-sm text-gray-700 dark:text-gray-300 py-2 bg-transparent focus:outline-none min-w-0"
      />
      <button
        type="button"
        onClick={() => onChange((value ?? 0) + 1)}
        className="px-3 py-2 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 border-l border-gray-200 dark:border-gray-700 text-sm font-medium flex-shrink-0"
      >
        +
      </button>
    </div>
  );
}
