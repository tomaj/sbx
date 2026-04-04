'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Guards against accidental navigation when a form has unsaved changes.
 *
 * - Intercepts all internal <a> link clicks in the document (capture phase)
 * - Prevents browser close/reload via beforeunload
 * - Provides `guardNavigate(href)` for programmatic navigation (router.push calls)
 * - Returns `showModal`, `handleConfirm`, `handleCancel` to wire up UnsavedChangesModal
 */
export function useUnsavedChanges(isDirty: boolean) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const pendingHref = useRef<string | null>(null);
  const isDirtyRef = useRef(isDirty);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // Browser close / page reload
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Intercept all internal <a> link clicks
  useEffect(() => {
    if (!isDirty) return;

    function handleClick(e: MouseEvent) {
      if (!isDirtyRef.current) return;
      const link = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null;
      if (!link) return;
      try {
        const url = new URL(link.href, window.location.href);
        // Skip external links
        if (url.hostname !== window.location.hostname) return;
        // Skip same-page navigations (hash changes, same path + search)
        if (url.pathname === window.location.pathname && url.search === window.location.search)
          return;
      } catch {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      pendingHref.current = link.href;
      setShowModal(true);
    }

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [isDirty]);

  /** Wrap programmatic router.push calls with this to guard them too. */
  function guardNavigate(href: string) {
    if (isDirtyRef.current) {
      pendingHref.current = href;
      setShowModal(true);
    } else {
      router.push(href);
    }
  }

  function handleConfirm() {
    setShowModal(false);
    if (pendingHref.current) {
      router.push(pendingHref.current);
      pendingHref.current = null;
    }
  }

  function handleCancel() {
    setShowModal(false);
    pendingHref.current = null;
  }

  return { showModal, handleConfirm, handleCancel, guardNavigate };
}
