'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { ConfirmModal } from '@/components/ui/confirm-modal';

export interface UseDeleteOptions<T> {
  getUrl: (item: T) => string;
  onSuccess: () => void;
  title: string;
  getMessage: (item: T) => string;
  confirmLabel?: string;
}

export interface UseDeleteReturn<T> {
  /** Call this to open the delete confirmation for an item */
  confirm: (item: T) => void;
  /** Rendered ConfirmModal — include this once somewhere in your JSX */
  modal: ReactNode;
  /** True while the DELETE request is in flight */
  deleting: boolean;
}

/**
 * Encapsulates the delete-confirmation flow:
 * - target state
 * - deleting state
 * - handleDelete (fires DELETE request)
 * - ConfirmModal JSX
 *
 * Usage:
 *   const deleteHook = useDelete({ getUrl: (t) => `/api/.../tasks/${t.id}`, onSuccess: mutate, ... })
 *   // In JSX:
 *   <button onClick={() => deleteHook.confirm(row)}>Delete</button>
 *   {deleteHook.modal}
 */
export function useDelete<T>(opts: UseDeleteOptions<T>): UseDeleteReturn<T> {
  const [target, setTarget] = useState<T | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!target) return;
    setDeleting(true);
    try {
      await fetch(opts.getUrl(target), { method: 'DELETE' });
      setTarget(null);
      opts.onSuccess();
    } finally {
      setDeleting(false);
    }
  }

  const modal = createElement(ConfirmModal, {
    open: !!target,
    title: opts.title,
    message: target ? opts.getMessage(target) : '',
    confirmLabel: opts.confirmLabel ?? 'Delete',
    dangerous: true,
    onConfirm: handleDelete,
    onCancel: () => setTarget(null),
  });

  return {
    confirm: (item: T) => setTarget(item),
    modal,
    deleting,
  };
}
