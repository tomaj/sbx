'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { formatDateTime, formatDate } from '@/lib/date';
import { SkeletonBlock } from '@/components/ui/skeleton';
import { useApi } from '@/lib/swr';

type Release = {
  id: number;
  name: string;
  uuid: string;
  release_at: string | null;
  released: boolean;
  created_at: string;
  updated_at: string;
};

interface ReleasesResponse {
  releases: Release[];
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatRelativeDate(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} days ago`;
  if (diff < 86400 * 365) return `${Math.floor(diff / (86400 * 30))} months ago`;
  return `${Math.floor(diff / (86400 * 365))} years ago`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function ContentPlannerClient({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params);
  const router = useRouter();

  const [search, setSearch] = useState('');

  // Calendar state
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Filter type: 'all' | 'scheduled' | 'unscheduled'
  const [filterType, setFilterType] = useState<'all' | 'scheduled' | 'unscheduled'>('scheduled');

  const { data, isLoading: loading } = useApi<ReleasesResponse>(
    `/api/admin/spaces/${spaceId}/releases`,
  );

  const releases = (data?.releases ?? []).filter((r: Release) => !r.released);

  // Calendar helpers
  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  // Days that have scheduled releases
  const scheduledDays = new Set(
    releases
      .filter((r) => r.release_at)
      .map((r) => {
        const d = new Date(r.release_at!);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      }),
  );

  function prevMonth() {
    if (calMonth === 0) {
      setCalYear((y) => y - 1);
      setCalMonth(11);
    } else setCalMonth((m) => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) {
      setCalYear((y) => y + 1);
      setCalMonth(0);
    } else setCalMonth((m) => m + 1);
  }

  function goToday() {
    setCalYear(today.getFullYear());
    setCalMonth(today.getMonth());
    setSelectedDay(null);
  }

  function handleDayClick(day: number) {
    const clicked = new Date(calYear, calMonth, day);
    if (selectedDay && isSameDay(selectedDay, clicked)) {
      setSelectedDay(null);
    } else {
      setSelectedDay(clicked);
      setFilterType('scheduled');
    }
  }

  // Filtered releases
  const filteredReleases = releases.filter((r) => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType === 'scheduled') {
      if (!r.release_at) return false;
      if (selectedDay) {
        const d = new Date(r.release_at);
        if (!isSameDay(d, selectedDay)) return false;
      }
      return true;
    }
    if (filterType === 'unscheduled') return !r.release_at;
    // 'all' — if day selected, show scheduled for that day only
    if (selectedDay) {
      if (!r.release_at) return false;
      return isSameDay(new Date(r.release_at), selectedDay);
    }
    return true;
  });

  const scheduledCount = releases.filter((r) => r.release_at).length;
  const unscheduledCount = releases.filter((r) => !r.release_at).length;

  function openRelease(release: Release) {
    router.push(`/spaces/${spaceId}/content?release_id=${release.id}`);
  }

  function handleCreateRelease() {
    router.push(`/spaces/${spaceId}/content`);
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => router.push(`/spaces/${spaceId}/content`)}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Content
        </button>
        <button
          onClick={handleCreateRelease}
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Release
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar */}
        <div className="w-[220px] shrink-0 border-r border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-5 overflow-y-auto">
          {/* Calendar */}
          <div>
            {/* Month nav */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={prevMonth}
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {MONTHS[calMonth]} {calYear}
              </span>
              <button
                onClick={nextMonth}
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-[10px] font-medium text-gray-400 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {/* Leading empty cells */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const date = new Date(calYear, calMonth, day);
                const isToday = isSameDay(date, today);
                const isSelected = selectedDay ? isSameDay(date, selectedDay) : false;
                const hasRelease = scheduledDays.has(`${calYear}-${calMonth}-${day}`);
                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className={`relative flex flex-col items-center justify-center w-7 h-7 mx-auto rounded-full text-[11px] transition-colors ${
                      isSelected
                        ? 'bg-teal-600 text-white font-semibold'
                        : isToday
                          ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-semibold'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {day}
                    {hasRelease && !isSelected && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Today link */}
            <button
              onClick={goToday}
              className="mt-2 text-xs text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
            >
              Today
            </button>
          </div>

          {/* Filter by type */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Filter by type
            </p>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => {
                  setFilterType('scheduled');
                  setSelectedDay(null);
                }}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  filterType === 'scheduled'
                    ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 font-medium border border-teal-200 dark:border-teal-700'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span>Scheduled Releases</span>
                <span
                  className={`text-xs ${filterType === 'scheduled' ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400'}`}
                >
                  {scheduledCount}
                </span>
              </button>
              <button
                onClick={() => {
                  setFilterType('unscheduled');
                  setSelectedDay(null);
                }}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  filterType === 'unscheduled'
                    ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 font-medium border border-teal-200 dark:border-teal-700'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span>Unscheduled releases</span>
                <span
                  className={`text-xs ${filterType === 'unscheduled' ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400'}`}
                >
                  {unscheduledCount}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 p-6">
          {/* Search */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg mb-4 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500 transition-colors">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search for a release"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 outline-none"
            />
          </div>

          {/* Release list */}
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredReleases.length === 0 ? (
            <div className="text-sm text-gray-400 dark:text-gray-500 py-4">
              {selectedDay
                ? `No releases scheduled for ${formatDate(selectedDay)}`
                : filterType === 'scheduled'
                  ? 'No scheduled releases'
                  : filterType === 'unscheduled'
                    ? 'No unscheduled releases'
                    : 'No releases found'}
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {filteredReleases.map((release) => (
                <button
                  key={release.id}
                  onClick={() => openRelease(release)}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                      <svg
                        className="w-4 h-4 text-gray-500 dark:text-gray-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                      {release.name}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 ml-4">
                    {release.release_at
                      ? `Scheduled: ${formatDateTime(release.release_at)}`
                      : `Edited: ${formatRelativeDate(release.updated_at)}`}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
