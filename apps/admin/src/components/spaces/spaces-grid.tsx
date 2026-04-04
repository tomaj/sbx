'use client';

import { useState, useCallback } from 'react';
import { useApi } from '@/lib/swr';
import { useRouter } from 'next/navigation';
import { Star, ChevronDown, ChevronRight, Search, Plus } from 'lucide-react';
import { SpaceCard } from './space-card';
import { CreateSpacePanel } from './create-space-panel';
import type { Space } from '@sbx/types';

function SectionHeader({
  label,
  count,
  open,
  onToggle,
  icon,
}: {
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-4 group"
    >
      {open ? (
        <ChevronDown className="size-3.5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
      ) : (
        <ChevronRight className="size-3.5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
      )}
      {icon}
      {label}
      <span className="text-gray-400 dark:text-gray-500 font-normal">· {count}</span>
    </button>
  );
}

export function SpacesGrid({ spaces }: { spaces: Space[] }) {
  const [search, setSearch] = useState('');
  const [favOpen, setFavOpen] = useState(true);
  const [allOpen, setAllOpen] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();

  const { data: meData, mutate: mutateMe } = useApi<{ user: { favourite_spaces: number[] } }>(
    '/api/admin/user/me',
  );
  const favouriteSpaces = meData?.user?.favourite_spaces ?? [];

  const toggleFav = useCallback(
    async (spaceId: number) => {
      const isFav = favouriteSpaces.includes(spaceId);
      const newIds = isFav
        ? favouriteSpaces.filter((id) => id !== spaceId)
        : [...favouriteSpaces, spaceId];
      const res = await fetch('/api/admin/user/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favourite_spaces: newIds }),
      });
      if (res.ok) {
        await mutateMe();
      }
    },
    [favouriteSpaces, mutateMe],
  );

  const query = search.trim().toLowerCase();
  const favoriteSpaces = spaces.filter((s) => favouriteSpaces.includes(s.id));
  const otherSpaces = spaces.filter((s) => !favouriteSpaces.includes(s.id));

  const filteredFavorites = query
    ? favoriteSpaces.filter((s) => s.name.toLowerCase().includes(query))
    : favoriteSpaces;
  const filteredOthers = query
    ? otherSpaces.filter((s) => s.name.toLowerCase().includes(query))
    : otherSpaces;
  const noResults = query && filteredFavorites.length === 0 && filteredOthers.length === 0;

  return (
    <div>
      {/* Search + Add */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors shrink-0"
        >
          <Plus className="size-4" />
          Add Space
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search spaces..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      {noResults && (
        <p className="text-sm text-gray-400 text-center py-12">
          No spaces match &ldquo;{search}&rdquo;
        </p>
      )}

      {/* Favorites section */}
      {filteredFavorites.length > 0 && (
        <div className="mb-8">
          <SectionHeader
            label="Favorites"
            count={filteredFavorites.length}
            open={favOpen}
            onToggle={() => setFavOpen((v) => !v)}
            icon={<Star className="size-3.5 fill-yellow-400 text-yellow-400" />}
          />
          {favOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFavorites.map((space) => (
                <SpaceCard
                  key={space.id}
                  space={space}
                  isFav
                  onToggleFav={() => toggleFav(space.id)}
                />
              ))}
            </div>
          )}
          <div className="mt-8 mb-6 border-t border-gray-100 dark:border-gray-800" />
        </div>
      )}

      {/* All spaces section */}
      {filteredOthers.length > 0 && (
        <div>
          <SectionHeader
            label="All Spaces"
            count={filteredOthers.length}
            open={allOpen}
            onToggle={() => setAllOpen((v) => !v)}
          />
          {allOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOthers.map((space) => (
                <SpaceCard
                  key={space.id}
                  space={space}
                  isFav={false}
                  onToggleFav={() => toggleFav(space.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <CreateSpacePanel
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(spaceId) => {
          setCreateOpen(false);
          router.push(`/spaces/${spaceId}`);
        }}
      />
    </div>
  );
}
