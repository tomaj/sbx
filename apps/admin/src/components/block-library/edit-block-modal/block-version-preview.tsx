'use client';

import { useState, useEffect } from 'react';
import { RotateCcw, LayoutGrid } from 'lucide-react';
import type { ComponentVersionDetail } from './versions-tab';

type PreviewTab = 'fields' | 'compare';

interface BlockVersionPreviewProps {
  version: ComponentVersionDetail;
  spaceId: string;
  blockId: string;
  blockName: string;
  onClose: () => void;
  onRestored: () => void;
}

export function BlockVersionPreview({
  version,
  spaceId,
  blockId,
  blockName,
  onClose,
  onRestored,
}: BlockVersionPreviewProps) {
  const [previewTab, setPreviewTab] = useState<PreviewTab>('fields');
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schema = version.schema ?? {};
  const fieldKeys = Object.keys(schema).filter((k) => !k.startsWith('_'));

  useEffect(() => {
    if (fieldKeys.length > 0 && !selectedField) {
      setSelectedField(fieldKeys[0]);
    }
  }, [selectedField, fieldKeys[0]]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRestore() {
    setRestoring(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/spaces/${spaceId}/components/${blockId}/versions/${version.id}/restore`,
        { method: 'PUT' },
      );
      if (!res.ok) throw new Error();
      onRestored();
      onClose();
    } catch {
      setError('Failed to restore version');
    } finally {
      setRestoring(false);
    }
  }

  const selectedDef = selectedField ? (schema[selectedField] as Record<string, any>) : null;

  return (
    <div className="relative flex flex-col flex-1 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-hidden min-w-0">
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Block Versions</h2>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-500">{error}</span>}
          <button
            onClick={handleRestore}
            disabled={restoring}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {restoring ? 'Restoring...' : 'Restore Version'}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title="Close preview"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-shrink-0 flex items-center border-b border-gray-200 dark:border-gray-700 px-6">
        {(['fields', 'compare'] as PreviewTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setPreviewTab(tab)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              previewTab === tab
                ? 'border-teal-600 text-teal-600 dark:text-teal-400 dark:border-teal-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {previewTab === 'fields' && (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 flex-shrink-0 overflow-y-auto border-r border-gray-200 dark:border-gray-700 py-4">
            <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              General
            </p>
            {fieldKeys.map((key) => {
              const def = schema[key] as Record<string, any>;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedField(key)}
                  className={`w-full text-left px-4 py-2.5 transition-colors ${
                    selectedField === key
                      ? 'bg-teal-50 dark:bg-teal-900/20 border-l-2 border-teal-500'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-2 border-transparent'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {key}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                    {def?.type ?? '—'}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {selectedDef ? (
              <FieldDetail fieldKey={selectedField!} def={selectedDef} />
            ) : (
              <p className="text-sm text-gray-400">Select a field to preview</p>
            )}
          </div>
        </div>
      )}

      {previewTab === 'compare' && (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <p className="text-sm">Compare view coming soon</p>
        </div>
      )}
    </div>
  );
}

function FieldDetail({ fieldKey, def }: { fieldKey: string; def: Record<string, any> }) {
  return (
    <div className="space-y-4">
      <ReadOnlyField label="Field type">
        <span className="capitalize">{def.type ?? '—'}</span>
      </ReadOnlyField>
      <ReadOnlyField label="Display name">{fieldKey}</ReadOnlyField>
      <ReadOnlyField label="Field name">
        <p className="text-sm text-gray-500 dark:text-gray-400">{fieldKey}</p>
      </ReadOnlyField>
      {def.description !== undefined && (
        <ReadOnlyField label="Description" minHeight>
          {def.description || <span className="text-gray-400">—</span>}
        </ReadOnlyField>
      )}
      <div className="flex flex-col gap-2">
        {def.required !== undefined && (
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={!!def.required} readOnly className="rounded" />
            Required field
          </label>
        )}
        {def.translatable !== undefined && (
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={!!def.translatable} readOnly className="rounded" />
            Translatable
          </label>
        )}
      </div>
      {def.default_value !== undefined && (
        <ReadOnlyField label="Default value">{String(def.default_value)}</ReadOnlyField>
      )}
      {def.max_length !== undefined && (
        <ReadOnlyField label="Maximum characters">{def.max_length}</ReadOnlyField>
      )}
      {def.regex !== undefined && (
        <ReadOnlyField label="Regex validation" mono>
          {def.regex}
        </ReadOnlyField>
      )}
      {def.options && Array.isArray(def.options) && def.options.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Options
          </label>
          <div className="space-y-1">
            {(def.options as any[]).map((opt, i) => (
              <div
                key={i}
                className="px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400 flex gap-2"
              >
                <span className="font-medium">{opt.name ?? opt.label ?? opt.value}</span>
                {opt.value && <span className="text-gray-400">→ {opt.value}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReadOnlyField({
  label,
  children,
  minHeight,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  minHeight?: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </label>
      <div
        className={`px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 ${minHeight ? 'min-h-[60px]' : ''} ${mono ? 'font-mono' : ''}`}
      >
        {children}
      </div>
    </div>
  );
}
