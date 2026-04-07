'use client';

import { ArrowLeftRight, ChevronDown } from 'lucide-react';
import { UserAvatar } from '@/components/ui/user-avatar';
import { formatDateTime as formatDate } from '@/lib/date';
import {
  type StoryVersion,
  type CompareResult,
  actionLabel,
  parseBreadcrumb,
  renderChangeValue,
} from './version-utils';

interface VersionCompareProps {
  versions: StoryVersion[];
  compareLeft: StoryVersion | null;
  compareRight: StoryVersion | null;
  compareResult: CompareResult | null;
  compareLoading: boolean;
  onSetLeft: (v: StoryVersion) => void;
  onSetRight: (v: StoryVersion) => void;
  onSwap: () => void;
}

export function VersionCompare({
  versions,
  compareLeft,
  compareRight,
  compareResult,
  compareLoading,
  onSetLeft,
  onSetRight,
  onSwap,
}: VersionCompareProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <VersionSelect
          versions={versions}
          selected={compareLeft}
          onSelect={onSetLeft}
          suffix="(Latest)"
        />
        <button
          onClick={onSwap}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
        >
          <ArrowLeftRight className="w-4 h-4" />
        </button>
        <VersionSelect versions={versions} selected={compareRight} onSelect={onSetRight} />
      </div>

      <div className="flex-1 overflow-y-auto">
        {compareLoading ? (
          <CompareSkeleton />
        ) : !compareResult ? null : compareResult.changes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <ArrowLeftRight className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              No content changes
            </p>
            <p className="text-xs mt-1">The selected versions have no content difference.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
              <VersionHeader version={compareLeft} result={compareResult.latest} />
              <VersionHeader version={compareRight} result={compareResult.target} />
            </div>
            {compareResult.changes.map((change, i) => {
              const breadcrumbs = parseBreadcrumb(change.path);
              const fieldName = breadcrumbs[breadcrumbs.length - 1] ?? change.path;
              return (
                <div key={i}>
                  <div className="px-6 pt-4 pb-2">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      {breadcrumbs.map((seg, si) => (
                        <span key={si} className="flex items-center gap-1">
                          {si > 0 && <ChevronDown className="w-3 h-3 -rotate-90" />}
                          <span
                            className={
                              si === breadcrumbs.length - 1
                                ? 'text-gray-600 dark:text-gray-300 font-medium'
                                : ''
                            }
                          >
                            {seg}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
                    <div className="px-6 pb-4">
                      <p className="text-xs font-medium text-gray-500 mb-1.5">
                        {fieldName}{' '}
                        <span className="text-gray-400 font-normal">
                          (
                          {typeof change.new === 'object' && change.new !== null
                            ? Array.isArray(change.new)
                              ? 'array'
                              : 'object'
                            : typeof change.new}
                          )
                        </span>
                      </p>
                      <div className="text-sm text-gray-900 dark:text-gray-100 rounded-md p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                        {renderChangeValue(change.new)}
                      </div>
                    </div>
                    <div className="px-6 pb-4">
                      <p className="text-xs font-medium text-gray-500 mb-1.5">
                        {fieldName}{' '}
                        <span className="text-gray-400 font-normal">
                          (
                          {typeof change.old === 'object' && change.old !== null
                            ? Array.isArray(change.old)
                              ? 'array'
                              : 'object'
                            : typeof change.old}
                          )
                        </span>
                      </p>
                      <div className="text-sm text-gray-500 rounded-md p-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                        {renderChangeValue(change.old)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function VersionHeader({
  version,
  result,
}: {
  version: StoryVersion | null;
  result: StoryVersion | null;
}) {
  if (!result || !version) return <div className="px-6 py-4" />;
  return (
    <div className="px-6 py-4 flex items-center gap-3">
      <UserAvatar
        name={version.user?.name ?? '?'}
        src={version.user?.avatar_url ?? null}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {actionLabel(version)}
        </p>
        <p className="text-xs text-gray-400">at {formatDate(version.created_at)}</p>
      </div>
    </div>
  );
}

function VersionSelect({
  versions,
  selected,
  onSelect,
  suffix,
}: {
  versions: StoryVersion[];
  selected: StoryVersion | null;
  onSelect: (v: StoryVersion) => void;
  suffix?: string;
}) {
  return (
    <div className="relative flex-1">
      <select
        className="w-full appearance-none text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 pr-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        value={selected?.id ?? ''}
        onChange={(e) => {
          const v = versions.find((v) => v.id === parseInt(e.target.value, 10));
          if (v) onSelect(v);
        }}
      >
        {versions.map((v) => (
          <option key={v.id} value={v.id}>
            {formatDate(v.created_at)}
            {suffix && v.id === versions[0]?.id ? ` ${suffix}` : ''}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
}

function CompareSkeleton() {
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
        {[0, 1].map((col) => (
          <div key={col} className="px-6 py-4 flex items-center gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="px-6 pt-4 pb-2">
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
          </div>
          <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
            {[0, 1].map((col) => (
              <div key={col} className="px-6 pb-4">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2" />
                <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
