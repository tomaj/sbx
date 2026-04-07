'use client';

import {
  ArrowLeft,
  Globe,
  History,
  ChevronDown,
  Calendar,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { PublishStatus } from './publish-status-badge';
import type { StoryDetail } from '../types';

interface StoryEditorToolbarProps {
  story: StoryDetail | null;
  isDirty: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  showPublishMenu: boolean;
  releaseId: number | null;
  openDraftUrl: string;
  openPublishedUrl: string;
  draftJsonUrl: string;
  publishedJsonUrl: string;
  onBack: () => void;
  onSave: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onTogglePublishMenu: () => void;
  onClosePublishMenu: () => void;
  onShowHistory: () => void;
  onShowSchedule: () => void;
}

export function StoryEditorToolbar({
  story,
  isDirty,
  isSaving,
  isPublishing,
  showPublishMenu,
  openDraftUrl,
  openPublishedUrl,
  draftJsonUrl,
  publishedJsonUrl,
  onBack,
  onSave,
  onPublish,
  onUnpublish,
  onTogglePublishMenu,
  onClosePublishMenu,
  onShowHistory,
  onShowSchedule,
}: StoryEditorToolbarProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
      <button
        type="button"
        onClick={onBack}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
      >
        <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </button>

      <div className="flex-1 min-w-0">
        {story ? (
          <>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {story.name}
            </h1>
            <p className="text-xs text-gray-400 truncate">{story.full_slug}</p>
          </>
        ) : (
          <div className="space-y-1.5">
            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-3 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          </div>
        )}
      </div>

      <button
        type="button"
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300 flex-shrink-0"
      >
        <Globe className="w-4 h-4" />
        Default
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      <button
        type="button"
        onClick={onShowHistory}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300 flex-shrink-0"
      >
        <History className="w-4 h-4" />
        History
      </button>

      <PublishStatus story={story} />

      <button
        type="button"
        onClick={onSave}
        disabled={isSaving || !isDirty || !story}
        className="px-4 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40 text-gray-700 dark:text-gray-300 flex-shrink-0"
      >
        {isSaving ? 'Saving...' : 'Save'}
      </button>

      <div className="relative flex flex-shrink-0">
        <button
          type="button"
          onClick={onPublish}
          disabled={isPublishing || !story}
          className="px-4 py-1.5 text-sm font-medium bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-l-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50"
        >
          {isPublishing ? 'Publishing...' : 'Publish'}
        </button>
        <button
          type="button"
          onClick={onTogglePublishMenu}
          disabled={!story}
          className="px-2 py-1.5 text-sm font-medium bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-r-lg border-l border-gray-700 dark:border-gray-300 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50"
        >
          <ChevronDown className="w-4 h-4" />
        </button>

        {showPublishMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={onClosePublishMenu} />
            <div className="absolute right-0 top-full mt-1 z-20 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  onShowSchedule();
                  onClosePublishMenu();
                }}
                className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Calendar className="w-4 h-4 text-gray-400" />
                Schedule Publishing
              </button>
              <div className="h-px bg-gray-100 dark:bg-gray-700" />
              <PublishMenuLink
                href={openDraftUrl}
                icon={ExternalLink}
                label="Open Draft"
                onClose={onClosePublishMenu}
              />
              <PublishMenuLink
                href={openPublishedUrl}
                icon={ExternalLink}
                label="Open Published"
                onClose={onClosePublishMenu}
              />
              <div className="h-px bg-gray-100 dark:bg-gray-700" />
              <PublishMenuLink
                href={draftJsonUrl}
                icon={FileText}
                label="Draft JSON"
                onClose={onClosePublishMenu}
              />
              <PublishMenuLink
                href={publishedJsonUrl}
                icon={FileText}
                label="Published JSON"
                onClose={onClosePublishMenu}
              />
              {story?.published && (
                <>
                  <div className="h-px bg-gray-100 dark:bg-gray-700" />
                  <button
                    type="button"
                    onClick={onUnpublish}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Unpublish
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PublishMenuLink({
  href,
  icon: Icon,
  label,
  onClose,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClose: () => void;
}) {
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClose}
        className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <Icon className="w-4 h-4 text-gray-400" />
        {label}
      </a>
    );
  }
  return (
    <span className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed">
      <Icon className="w-4 h-4" />
      {label}
    </span>
  );
}
