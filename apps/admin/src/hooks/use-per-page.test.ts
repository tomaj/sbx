import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { usePerPage } from './use-per-page';

const STORAGE_KEY = 'test-per-page';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('usePerPage', () => {
  it('returns the default value when localStorage is empty', () => {
    const { result } = renderHook(() => usePerPage(STORAGE_KEY));
    expect(result.current[0]).toBe(25);
  });

  it('accepts a custom default value', () => {
    const { result } = renderHook(() => usePerPage(STORAGE_KEY, 50));
    expect(result.current[0]).toBe(50);
  });

  it('restores a valid value from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, '100');
    const { result } = renderHook(() => usePerPage(STORAGE_KEY));
    expect(result.current[0]).toBe(100);
  });

  it('falls back to defaultValue when stored value is not in the valid set', () => {
    localStorage.setItem(STORAGE_KEY, '99');
    const { result } = renderHook(() => usePerPage(STORAGE_KEY));
    expect(result.current[0]).toBe(25);
  });

  it('falls back to defaultValue when stored value is not a number', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid');
    const { result } = renderHook(() => usePerPage(STORAGE_KEY));
    expect(result.current[0]).toBe(25);
  });

  it('updates the state and persists to localStorage', () => {
    const { result } = renderHook(() => usePerPage(STORAGE_KEY));

    act(() => {
      result.current[1](50);
    });

    expect(result.current[0]).toBe(50);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('50');
  });

  it('all valid values (10, 24, 25, 50, 100) are accepted from localStorage', () => {
    for (const v of [10, 24, 25, 50, 100]) {
      localStorage.setItem(STORAGE_KEY, String(v));
      const { result } = renderHook(() => usePerPage(STORAGE_KEY));
      expect(result.current[0]).toBe(v);
    }
  });

  it('separate storage keys are independent', () => {
    localStorage.setItem('key-a', '10');
    localStorage.setItem('key-b', '100');

    const { result: a } = renderHook(() => usePerPage('key-a'));
    const { result: b } = renderHook(() => usePerPage('key-b'));

    expect(a.current[0]).toBe(10);
    expect(b.current[0]).toBe(100);
  });
});
