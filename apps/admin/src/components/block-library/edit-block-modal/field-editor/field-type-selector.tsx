'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FieldIcon } from '../field-icon';
import { type FieldType, ADDABLE_FIELD_TYPES, FIELD_TYPE_LABELS } from '../types';
import { FormRow, Label } from './form-primitives';

export function FieldTypePicker({
  filter,
  setFilter,
  selected,
  onSelect,
}: {
  filter: string;
  setFilter: (v: string) => void;
  selected: FieldType;
  onSelect: (t: FieldType) => void;
}) {
  const filtered = ADDABLE_FIELD_TYPES.filter((ft) =>
    ft.label.toLowerCase().includes(filter.toLowerCase()),
  );
  return (
    <div className="p-3">
      <div className="relative mb-2">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter field types"
          className="w-full pl-8 pr-3 py-1.5 border border-teal-400 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none"
        />
        <svg
          className="absolute left-2.5 top-2 w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <div className="grid grid-cols-4 gap-1 max-h-52 overflow-y-auto">
        {filtered.map((ft) => (
          <button
            key={ft.type}
            type="button"
            onClick={() => onSelect(ft.type)}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-colors ${
              selected === ft.type
                ? 'bg-gray-100 dark:bg-gray-800'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
            }`}
          >
            <FieldIcon type={ft.type} size={24} />
            <span className="text-[9px] text-gray-600 dark:text-gray-400 leading-tight text-center">
              {ft.label}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-4 text-center py-4 text-sm text-gray-400">No types found</div>
        )}
      </div>
    </div>
  );
}

export function FieldTypeSelector({
  value,
  onChange,
}: {
  value: FieldType;
  onChange: (t: FieldType) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const label = FIELD_TYPE_LABELS[value] ?? value;

  return (
    <FormRow>
      <Label>Field type</Label>
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            setFilter('');
          }}
          className="w-full flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
        >
          <FieldIcon type={value} size={20} />
          <span className="flex-1 text-left text-sm text-gray-900 dark:text-gray-100">{label}</span>
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl">
              <FieldTypePicker
                filter={filter}
                setFilter={setFilter}
                selected={value}
                onSelect={(t) => {
                  onChange(t);
                  setOpen(false);
                }}
              />
            </div>
          </>
        )}
      </div>
    </FormRow>
  );
}
