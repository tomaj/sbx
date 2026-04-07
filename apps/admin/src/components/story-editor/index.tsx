'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Diamond, Layers, Pencil, Info, MessageSquare, SlidersHorizontal } from 'lucide-react';
import { EditTab } from './edit-tab';
import { InfoTab } from './info-tab';
import { ConfigTab } from './config-tab';
import { CommentTab } from './comment-tab';
import { FieldDiscussionPanel } from './field-discussion-panel';
import { LayersPanel } from './layers-panel';
import { StoryHistoryPanel } from './story-history-panel';
import { BlockLibraryModal } from './block-library-modal';
import { useStoryEditor } from './hooks/use-story-editor';
import { usePreviewIframe } from './hooks/use-preview-iframe';
import { StoryEditorToolbar } from './components/story-editor-toolbar';
import { SchedulePublishModal } from './components/schedule-publish-modal';
import { PreviewPane } from './components/preview-pane';
import { LeftSidebar } from './components/left-sidebar';
import { UnsavedChangesModal } from '@/components/ui/unsaved-changes-modal';
import type { ComponentMeta, ComponentGroup, StoryDetail } from './types';

interface PreviewUrl {
  name: string;
  location: string;
}

interface Props {
  spaceId: string;
  story: StoryDetail | null;
  componentSchema: Record<string, any> | null;
  allComponents: ComponentMeta[];
  allGroups: ComponentGroup[];
  domain?: string;
  previewUrls?: PreviewUrl[];
  mobileWidth?: number;
  previewToken?: string;
  publicToken?: string;
  releaseId?: number | null;
  releaseName?: string | null;
  parentDisableFEEditor?: boolean;
  encodeUrl?: boolean;
  visualEditorDisabled?: boolean;
}

type PanelTab = 'edit' | 'info' | 'workflow' | 'comment' | 'config';
type LeftPanel = null | 'layers' | 'content';
type ViewMode = 'desktop' | 'mobile' | 'fullwidth';

const PANEL_TABS: {
  id: PanelTab;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'edit', label: 'Edit', Icon: Pencil },
  { id: 'info', label: 'Info', Icon: Info },
  { id: 'workflow', label: 'Workflow', Icon: Diamond },
  { id: 'comment', label: 'Comment', Icon: MessageSquare },
  { id: 'config', label: 'Config', Icon: SlidersHorizontal },
];

export function StoryEditor({
  spaceId,
  story: initialStory,
  componentSchema,
  allComponents,
  allGroups,
  domain = '',
  previewUrls = [],
  mobileWidth = 360,
  previewToken = '',
  publicToken = '',
  releaseId = null,
  releaseName = null,
  parentDisableFEEditor = false,
  encodeUrl = false,
  visualEditorDisabled = false,
}: Props) {
  const router = useRouter();

  const {
    story,
    setStory,
    content,
    isDirty,
    isSaving,
    isPublishing,
    error,
    showUnsavedModal,
    confirmUnsaved,
    cancelUnsaved,
    guardNavigate,
    discussionCounts,
    openDiscussionCount,
    mutateDiscussions,
    handleFieldChange,
    save,
    handlePublish,
    handleUnpublish,
    handleConfigSave,
  } = useStoryEditor({ spaceId, initialStory, releaseId: releaseId ?? null });

  const isFormOnly =
    visualEditorDisabled || parentDisableFEEditor || (story?.disable_fe_editor ?? false);
  const [showPreview, setShowPreview] = useState(!isFormOnly);
  const [activePanel, setActivePanel] = useState<PanelTab>('edit');
  const [activeLeftPanel, setActiveLeftPanel] = useState<LeftPanel>(null);
  const [showPublishMenu, setShowPublishMenu] = useState(false);
  const [showPreviewMenu, setShowPreviewMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showBlockLibrary, setShowBlockLibrary] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const viewModeStorageKey = 'sbx-preview-view-mode';
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  useEffect(() => {
    const saved = localStorage.getItem(viewModeStorageKey);
    if (saved === 'desktop' || saved === 'mobile' || saved === 'fullwidth') setViewMode(saved);
  }, []);
  const [activeDiscussionField, setActiveDiscussionField] = useState<string | null>(null);
  const [activeDiscussionRect, setActiveDiscussionRect] = useState<DOMRect | null>(null);

  const previewStorageKey = `sbx-preview-url-${spaceId}`;
  const [selectedPreviewKey, setSelectedPreviewKey] = useState<string>(() =>
    typeof window !== 'undefined'
      ? (localStorage.getItem(previewStorageKey) ?? 'domain')
      : 'domain',
  );

  const { iframeRef, mobileViewWidth, startResize } = usePreviewIframe({
    story,
    content,
    mobileWidth,
  });

  // Build preview URL params for visual editor bridge
  const previewParams = useMemo(() => {
    if (!story) return '';
    const params = new URLSearchParams();
    params.set('_storyblok', String(story.id));
    params.set('_storyblok_tk[space_id]', spaceId);
    params.set('_storyblok_tk[timestamp]', '0');
    params.set('_storyblok_tk[token]', 'sbx-preview');
    const str = params.toString();
    return encodeUrl ? str : str.replace(/%5B/gi, '[').replace(/%5D/gi, ']');
  }, [story, spaceId, encodeUrl]);

  function getSelectedBase(): string {
    if (selectedPreviewKey === 'domain') return domain;
    const idx = parseInt(selectedPreviewKey.replace('preview-', ''), 10);
    return previewUrls[idx]?.location ?? '';
  }

  const selectedPreviewBase = getSelectedBase();
  const fullPreviewUrl =
    story && selectedPreviewBase
      ? selectedPreviewBase.replace(/\/$/, '') +
        '/' +
        story.full_slug +
        '?' +
        previewParams +
        (releaseId != null ? `&_storyblok_release=${releaseId}` : '')
      : '';

  const openDraftUrl = fullPreviewUrl;
  const openPublishedUrl =
    story && selectedPreviewBase
      ? `${selectedPreviewBase.replace(/\/$/, '')}/${story.full_slug}?_storyblok_published=${story.id}`
      : '';
  const draftJsonUrl =
    story && previewToken
      ? `/v2/cdn/stories/${story.full_slug}?version=draft&token=${previewToken}${releaseId != null ? `&from_release=${releaseId}` : ''}`
      : '';
  const publishedJsonUrl =
    story && publicToken
      ? `/v2/cdn/stories/${story.full_slug}?version=published&token=${publicToken}`
      : '';

  function selectPreviewKey(key: string) {
    setSelectedPreviewKey(key);
    localStorage.setItem(previewStorageKey, key);
  }

  function handleBack() {
    const parentId = story?.parent_id;
    const base = parentId
      ? `/spaces/${spaceId}/content?parent_id=${parentId}`
      : `/spaces/${spaceId}/content`;
    const href = releaseId != null ? `${base}${parentId ? '&' : '?'}release_id=${releaseId}` : base;
    guardNavigate(href);
  }

  const editTabProps = {
    spaceId,
    schema: componentSchema,
    content,
    allComponents,
    allGroups,
    onChange: handleFieldChange,
    loading: !story,
    onOpenDiscussion: story
      ? (fk: string, rect: DOMRect) => {
          setActiveDiscussionField(fk);
          setActiveDiscussionRect(rect);
        }
      : undefined,
    activeDiscussionField,
    discussionCounts,
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 overflow-hidden">
      <StoryEditorToolbar
        story={story}
        isDirty={isDirty}
        isSaving={isSaving}
        isPublishing={isPublishing}
        showPublishMenu={showPublishMenu}
        releaseId={releaseId ?? null}
        openDraftUrl={openDraftUrl}
        openPublishedUrl={openPublishedUrl}
        draftJsonUrl={draftJsonUrl}
        publishedJsonUrl={publishedJsonUrl}
        onBack={handleBack}
        onSave={() => save()}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
        onTogglePublishMenu={() => setShowPublishMenu((p) => !p)}
        onClosePublishMenu={() => setShowPublishMenu(false)}
        onShowHistory={() => setShowHistory(true)}
        onShowSchedule={() => setShowScheduleModal(true)}
      />

      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm border-b border-red-200 dark:border-red-800 flex-shrink-0">
          {error}
        </div>
      )}

      {releaseId != null && (
        <div className="px-4 py-2 bg-teal-50 dark:bg-teal-900/20 border-b border-teal-200 dark:border-teal-800 flex items-center gap-2 flex-shrink-0">
          <Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
          <span className="text-xs text-teal-700 dark:text-teal-300">
            Editing in release: <strong>{releaseName ?? `#${releaseId}`}</strong> — changes go into
            the release snapshot, not live content.
          </span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          spaceId={spaceId}
          isFormOnly={isFormOnly}
          showPreview={showPreview}
          activeLeftPanel={activeLeftPanel}
          showMoreMenu={showMoreMenu}
          onTogglePreview={() => setShowPreview((p) => !p)}
          onToggleLeftPanel={(panel) =>
            setActiveLeftPanel((prev) => (prev === panel ? null : panel))
          }
          onToggleMoreMenu={() => setShowMoreMenu((p) => !p)}
          onCloseMoreMenu={() => setShowMoreMenu(false)}
          onOpenBlockLibrary={() => setShowBlockLibrary(true)}
        />

        {activeLeftPanel === 'layers' && (
          <LayersPanel content={content} onClose={() => setActiveLeftPanel(null)} />
        )}

        {activeLeftPanel === 'content' && (
          <div className="w-72 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Content</h3>
              <button
                type="button"
                onClick={() => setActiveLeftPanel(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-gray-400"
              >
                ×
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <p className="text-sm">Coming soon</p>
            </div>
          </div>
        )}

        {showPreview && (
          <PreviewPane
            spaceId={spaceId}
            story={story}
            iframeRef={iframeRef}
            fullPreviewUrl={fullPreviewUrl}
            viewMode={viewMode}
            mobileViewWidth={mobileViewWidth}
            mobileWidth={mobileWidth}
            selectedPreviewKey={selectedPreviewKey}
            showPreviewMenu={showPreviewMenu}
            domain={domain}
            previewUrls={previewUrls}
            onSetViewMode={(mode) => {
              setViewMode(mode);
              localStorage.setItem(viewModeStorageKey, mode);
            }}
            onSelectPreviewKey={selectPreviewKey}
            onTogglePreviewMenu={() => setShowPreviewMenu((p) => !p)}
            onClosePreviewMenu={() => setShowPreviewMenu(false)}
            startResize={startResize}
          />
        )}

        {!showPreview && (
          <div className="flex-1 overflow-hidden bg-white dark:bg-gray-900 flex flex-col">
            <div className="flex-1 flex flex-col overflow-hidden max-w-3xl mx-auto w-full">
              <EditTab {...editTabProps} />
            </div>
          </div>
        )}

        {/* Right panel */}
        <div className="flex flex-shrink-0" style={{ width: 520 }}>
          <div className="flex-1 flex flex-col overflow-hidden border-l border-r border-gray-200 dark:border-gray-700">
            <div className="flex-1 flex flex-col overflow-hidden">
              {showPreview && activePanel === 'edit' && <EditTab {...editTabProps} />}
              {activePanel === 'info' &&
                (story ? (
                  <InfoTab story={story} />
                ) : (
                  <SkeletonFields rows={[60, 40, 80, 50, 70]} />
                ))}
              {activePanel === 'workflow' && (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <Diamond className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Workflow — coming soon</p>
                  </div>
                </div>
              )}
              {activePanel === 'comment' && (
                <CommentTab
                  spaceId={spaceId}
                  storyId={story?.id ?? null}
                  onDiscussionChange={mutateDiscussions}
                />
              )}
              {activePanel === 'config' &&
                (story ? (
                  <ConfigTab
                    spaceId={spaceId}
                    story={story}
                    onSave={handleConfigSave}
                    isFormOnly={isFormOnly}
                  />
                ) : (
                  <SkeletonFields rows={[70, 50, 90, 40, 65]} tall />
                ))}
            </div>
          </div>

          <div className="w-14 flex flex-col items-center py-3 gap-1 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex-shrink-0">
            {PANEL_TABS.filter(({ id }) => showPreview || id !== 'edit').map(
              ({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActivePanel(id)}
                  title={label}
                  className={`flex flex-col items-center gap-0.5 w-full py-2 px-1 rounded-lg transition-colors ${
                    activePanel === id
                      ? 'bg-gray-100 dark:bg-gray-800 text-teal-600 dark:text-teal-400'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <div className="relative">
                    <Icon className="w-4 h-4" />
                    {id === 'comment' && openDiscussionCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                        {openDiscussionCount > 9 ? '9+' : openDiscussionCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium">{label}</span>
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      {showScheduleModal && story && (
        <SchedulePublishModal
          spaceId={spaceId}
          storyId={story.id}
          onClose={() => setShowScheduleModal(false)}
          onScheduled={(updated) => {
            setStory(updated);
            setShowPublishMenu(false);
          }}
        />
      )}

      {showHistory && story && (
        <StoryHistoryPanel
          spaceId={spaceId}
          storyId={story.id}
          storyName={story.name}
          storySlug={story.full_slug}
          previewUrl={fullPreviewUrl || undefined}
          onClose={() => setShowHistory(false)}
          onRestore={() => {
            setStory(null);
            router.refresh();
          }}
        />
      )}

      {activeDiscussionField && story && (
        <FieldDiscussionPanel
          spaceId={spaceId}
          storyId={story.id}
          fieldKey={activeDiscussionField}
          fieldLabel={activeDiscussionField}
          targetRect={activeDiscussionRect}
          onClose={() => {
            setActiveDiscussionField(null);
            setActiveDiscussionRect(null);
          }}
          onDiscussionChange={mutateDiscussions}
        />
      )}

      {showBlockLibrary && (
        <BlockLibraryModal spaceId={spaceId} onClose={() => setShowBlockLibrary(false)} />
      )}

      <UnsavedChangesModal
        open={showUnsavedModal}
        onConfirm={confirmUnsaved}
        onCancel={cancelUnsaved}
      />
    </div>
  );
}

function SkeletonFields({ rows, tall = false }: { rows: number[]; tall?: boolean }) {
  return (
    <div className="px-5 py-5 space-y-6 overflow-y-auto flex-1">
      <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      {rows.map((w, i) => (
        <div key={i} className="space-y-2">
          <div
            className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
            style={{ width: `${w}%` }}
          />
          <div
            className={`w-full bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse ${tall ? 'h-10' : 'h-9'}`}
          />
        </div>
      ))}
    </div>
  );
}
