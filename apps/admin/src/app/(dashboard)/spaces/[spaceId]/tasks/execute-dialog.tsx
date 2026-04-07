'use client';

import { useState, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import type { Task } from '@sbx/types';

interface ExecuteDialogProps {
  open: boolean;
  task: Task | null;
  spaceId: string;
  onClose: () => void;
  onExecuted: () => void;
}

export function ExecuteDialog({ open, task, spaceId, onClose, onExecuted }: ExecuteDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fields = task ? (Object.entries(task.user_dialog ?? {}) as [string, any][]) : [];

  useEffect(() => {
    if (!open || !task) return;
    const initial: Record<string, string> = {};
    for (const [key, def] of fields) {
      if (def.type === 'option' && def.options?.length) {
        initial[key] = def.options[0].value;
      } else {
        initial[key] = '';
      }
    }
    setValues(initial);
    setError(null);
    setRunning(false);
  }, [open, task, fields]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function handleExecute() {
    if (!task) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/tasks/${task.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dialog_values: values }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Execution failed');
      onExecuted();
    } catch (e: any) {
      setError(e.message ?? 'Execution failed');
      setRunning(false);
    }
  }

  if (!open || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            Execute: {task.name}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <Plus className="w-4 h-4 rotate-45" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {fields.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This task has no user input fields. Click Execute to run it immediately.
            </p>
          )}
          {fields.map(([key, def]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {def.display_name || key}
                {def.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {def.type === 'option' ? (
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {(def.options ?? []).map((opt: any) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`dialog_${key}`}
                        value={opt.value}
                        checked={values[key] === opt.value}
                        onChange={() => setValues((prev) => ({ ...prev, [key]: opt.value }))}
                        className="w-4 h-4 accent-teal-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{opt.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  value={values[key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                  placeholder={def.placeholder ?? ''}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              )}
            </div>
          ))}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleExecute}
            disabled={running}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50"
          >
            {running && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {running ? 'Running…' : 'Execute'}
          </button>
        </div>
      </div>
    </div>
  );
}
