'use client';

import { useState, useRef, useEffect } from 'react';
import type { RefObject } from 'react';

export function useContextMenu(): {
  open: boolean;
  ref: RefObject<HTMLDivElement | null>;
  toggle: () => void;
  close: () => void;
} {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  function toggle() {
    setOpen((prev) => !prev);
  }

  function close() {
    setOpen(false);
  }

  return { open, ref, toggle, close };
}
