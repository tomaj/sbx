import { useState } from 'react';

const VALID_VALUES = [10, 24, 25, 50, 100];

export function usePerPage(storageKey: string, defaultValue = 25): [number, (v: number) => void] {
  const [perPage, setPerPageState] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const n = Number(stored);
        if (VALID_VALUES.includes(n)) return n;
      }
    } catch {}
    return defaultValue;
  });

  function setPerPage(v: number) {
    setPerPageState(v);
    try {
      localStorage.setItem(storageKey, String(v));
    } catch {}
  }

  return [perPage, setPerPage];
}
