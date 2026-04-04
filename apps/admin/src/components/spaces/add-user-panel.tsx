'use client';

import { useState, useEffect, useRef } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { UserAvatar } from '@/components/ui/user-avatar';
import type { SpaceRoleRef, UserSearchResult } from '@sbx/types';
import { FormField } from '@/components/ui/form-field';
import { useApi } from '@/lib/swr';

interface AddUserPanelProps {
  spaceId: string;
  roles: SpaceRoleRef[];
  onClose: () => void;
  onAdded: () => void;
}

/**
 * Right-panel for adding a new user to a space.
 * Supports single role (admin/editor/custom) or multiple custom roles.
 */
export function AddUserPanel({ spaceId, roles, onClose, onAdded }: AddUserPanelProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [roleMode, setRoleMode] = useState<'single' | 'multiple'>('single');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [roleDropOpen, setRoleDropOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  // Debounce search input before passing to SWR
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(timer);
  }, [search]);

  const searchUrl =
    debouncedSearch.length >= 1
      ? `/api/admin/spaces/${spaceId}/users/search?q=${encodeURIComponent(debouncedSearch)}`
      : null;
  const { data: searchData } = useApi<{ users: UserSearchResult[] }>(searchUrl);
  const searchResults = searchData?.users ?? [];

  // Open dropdown when results arrive
  useEffect(() => {
    if (searchResults.length > 0) setSearchOpen(true);
  }, [searchResults]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) setRoleDropOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const singleRoleOptions = [
    { id: 'admin', label: 'Admin' },
    { id: 'editor', label: 'Editor' },
    ...roles.map((r) => ({ id: `role:${r.id}`, label: r.role })),
  ];
  const multipleRoleOptions = roles;
  const selectedRoleLabel = singleRoleOptions.find((r) => r.id === selectedRole)?.label ?? '';

  function toggleMultiRole(id: number) {
    setSelectedRoleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const canSend =
    selectedUser && (roleMode === 'single' ? !!selectedRole : selectedRoleIds.length > 0);

  async function handleSend() {
    if (!canSend || !selectedUser) return;
    setSaving(true);
    setError(null);
    try {
      let body: Record<string, unknown>;
      if (roleMode === 'single') {
        if (selectedRole.startsWith('role:')) {
          const spaceRoleId = parseInt(selectedRole.replace('role:', ''), 10);
          body = {
            userId: selectedUser.id,
            role: String(spaceRoleId),
            spaceRoleId,
            spaceRoleIds: [],
          };
        } else {
          body = {
            userId: selectedUser.id,
            role: selectedRole,
            spaceRoleId: null,
            spaceRoleIds: [],
          };
        }
      } else {
        body = {
          userId: selectedUser.id,
          role: 'editor',
          spaceRoleId: null,
          spaceRoleIds: selectedRoleIds,
        };
      }
      const res = await fetch(`/api/admin/spaces/${spaceId}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Failed to add user');
      }
      onAdded();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/20 dark:bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add new user</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          {/* User search */}
          <FormField label="User" required>
            <div className="relative" ref={searchRef}>
              {selectedUser ? (
                <div className="flex items-center gap-2 w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
                  <UserAvatar
                    name={`${selectedUser.firstname} ${selectedUser.lastname}`}
                    src={selectedUser.avatar}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {selectedUser.firstname} {selectedUser.lastname}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {selectedUser.email}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setSearch('');
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                      placeholder="Add people by username or email address"
                      className="w-full px-3 py-2.5 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  {searchOpen && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => {
                            setSelectedUser(u);
                            setSearch('');
                            setSearchOpen(false);
                          }}
                          className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors"
                        >
                          <UserAvatar name={`${u.firstname} ${u.lastname}`} src={u.avatar} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {u.firstname} {u.lastname}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {u.email}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </FormField>

          {/* Roles */}
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Roles <span className="text-red-500">*</span>
            </p>
            <div className="flex items-center gap-6 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="roleMode"
                  checked={roleMode === 'single'}
                  onChange={() => {
                    setRoleMode('single');
                    setSelectedRoleIds([]);
                  }}
                  className="w-4 h-4 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Single role</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="roleMode"
                  checked={roleMode === 'multiple'}
                  onChange={() => {
                    setRoleMode('multiple');
                    setSelectedRole('');
                  }}
                  className="w-4 h-4 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Multiple roles</span>
              </label>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Choose role <span className="text-red-500">*</span>
              </p>

              {roleMode === 'single' ? (
                <div className="relative" ref={roleRef}>
                  <button
                    type="button"
                    onClick={() => setRoleDropOpen((o) => !o)}
                    className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-left focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <span
                      className={
                        selectedRoleLabel ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'
                      }
                    >
                      {selectedRoleLabel || 'Choose...'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </button>
                  {roleDropOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                      {singleRoleOptions.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => {
                            setSelectedRole(opt.id);
                            setRoleDropOpen(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {multipleRoleOptions.length === 0 ? (
                    <p className="text-sm text-gray-400">No custom roles defined for this space.</p>
                  ) : (
                    multipleRoleOptions.map((r) => (
                      <label
                        key={r.id}
                        className="flex items-center gap-3 px-1 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRoleIds.includes(r.id)}
                          onChange={() => toggleMultiRole(r.id)}
                          className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                        <span className="text-sm text-gray-900 dark:text-gray-100">{r.role}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!canSend || saving}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {saving ? 'Adding...' : 'Send invite'}
          </button>
        </div>
      </div>
    </div>
  );
}
