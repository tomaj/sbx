import '@testing-library/jest-dom';

// Ensure a fully functional localStorage is available in all test environments.
// jsdom provides window.localStorage but the plain `localStorage` global may behave
// differently depending on the vitest runner version — this guarantees consistency.
const createStorageMock = () => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
};

Object.defineProperty(globalThis, 'localStorage', {
  value: createStorageMock(),
  writable: true,
});
