'use client';

import { Monitor, Smartphone, Maximize2, Settings, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

type ViewMode = 'desktop' | 'mobile' | 'fullwidth';

interface PreviewUrl {
  name: string;
  location: string;
}

interface PreviewPaneProps {
  spaceId: string;
  story: { id: number } | null;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  fullPreviewUrl: string;
  viewMode: ViewMode;
  mobileViewWidth: number;
  mobileWidth: number;
  selectedPreviewKey: string;
  showPreviewMenu: boolean;
  domain: string;
  previewUrls: PreviewUrl[];
  onSetViewMode: (mode: ViewMode) => void;
  onSelectPreviewKey: (key: string) => void;
  onTogglePreviewMenu: () => void;
  onClosePreviewMenu: () => void;
  startResize: (side: 'left' | 'right', startX: number) => void;
}

export function PreviewPane({
  spaceId,
  story,
  iframeRef,
  fullPreviewUrl,
  viewMode,
  mobileViewWidth,
  mobileWidth,
  selectedPreviewKey,
  showPreviewMenu,
  domain,
  previewUrls,
  onSetViewMode,
  onSelectPreviewKey,
  onTogglePreviewMenu,
  onClosePreviewMenu,
  startResize,
}: PreviewPaneProps) {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Preview toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
        <div className="flex items-center gap-0.5 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5 flex-shrink-0">
          {(
            [
              { mode: 'desktop' as ViewMode, Icon: Monitor, title: 'Open desktop view' },
              { mode: 'mobile' as ViewMode, Icon: Smartphone, title: 'Open mobile view' },
              { mode: 'fullwidth' as ViewMode, Icon: Maximize2, title: 'Open full-width view' },
            ] as const
          ).map(({ mode, Icon, title }) => (
            <button
              key={mode}
              type="button"
              onClick={() => onSetViewMode(mode)}
              title={title}
              className={`p-1.5 rounded transition-colors ${viewMode === mode ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        <div className="flex-1 text-xs text-gray-400 dark:text-gray-500 truncate text-center min-w-0">
          {fullPreviewUrl || (story ? 'No preview URL configured' : '')}
        </div>

        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={onTogglePreviewMenu}
            title="Preview URL settings"
            className={`p-1.5 rounded transition-colors ${showPreviewMenu ? 'bg-gray-100 dark:bg-gray-800 text-gray-700' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <Settings className="w-4 h-4" />
          </button>

          {showPreviewMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={onClosePreviewMenu} />
              <div className="absolute right-0 top-full mt-1 z-20 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Preview URLs
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onClosePreviewMenu();
                      router.push(`/spaces/${spaceId}/settings/visual-editor`);
                    }}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Edit preview URLs"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {domain && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectPreviewKey('domain');
                        onClosePreviewMenu();
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${selectedPreviewKey === 'domain' ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                      <div className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                        {domain}
                      </div>
                      <div className="text-xs text-gray-400">- Default</div>
                    </button>
                  )}
                  {previewUrls.map((pu, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        onSelectPreviewKey(`preview-${i}`);
                        onClosePreviewMenu();
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${selectedPreviewKey === `preview-${i}` ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                      <div className="text-xs text-gray-800 dark:text-gray-200 truncate">
                        {pu.location}
                      </div>
                      <div className="text-xs text-gray-400">- {pu.name}</div>
                    </button>
                  ))}
                  {!domain && previewUrls.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2">
                      No preview URLs configured
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-800">
        {!story ? (
          <div className="w-full h-full animate-pulse bg-gray-200 dark:bg-gray-700" />
        ) : !fullPreviewUrl ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <Settings className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No preview URL</p>
              <p className="text-xs mt-1">
                Configure one in{' '}
                <button
                  type="button"
                  onClick={() => router.push(`/spaces/${spaceId}/settings/visual-editor`)}
                  className="underline hover:text-gray-600"
                >
                  Visual Editor settings
                </button>
              </p>
            </div>
          </div>
        ) : viewMode === 'mobile' ? (
          <div className="flex h-full items-stretch justify-center py-4">
            <div className="flex items-center justify-center flex-shrink-0 w-8">
              <span
                className="text-[10px] text-gray-400 select-none whitespace-nowrap"
                style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
              >
                {mobileViewWidth !== mobileWidth
                  ? `Custom W:${mobileViewWidth}`
                  : `Mobile W:${mobileWidth}`}
              </span>
            </div>
            <div
              className="flex items-center justify-center w-4 flex-shrink-0 cursor-ew-resize group select-none"
              onMouseDown={(e) => {
                e.preventDefault();
                startResize('left', e.clientX);
              }}
            >
              <div className="w-1 h-10 bg-gray-300 dark:bg-gray-600 rounded-full group-hover:bg-gray-400 dark:group-hover:bg-gray-500 transition-colors" />
            </div>
            <div
              className="bg-white rounded-lg overflow-hidden flex-shrink-0"
              style={{
                width: mobileViewWidth,
                boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)',
              }}
            >
              <iframe
                ref={iframeRef}
                src={fullPreviewUrl}
                className="w-full h-full border-none"
                title="Story preview"
              />
            </div>
            <div
              className="flex items-center justify-center w-4 flex-shrink-0 cursor-ew-resize group select-none"
              onMouseDown={(e) => {
                e.preventDefault();
                startResize('right', e.clientX);
              }}
            >
              <div className="w-1 h-10 bg-gray-300 dark:bg-gray-600 rounded-full group-hover:bg-gray-400 dark:group-hover:bg-gray-500 transition-colors" />
            </div>
          </div>
        ) : viewMode === 'desktop' ? (
          <div className="flex h-full items-stretch justify-center">
            <div className="bg-white flex-shrink-0" style={{ width: 1280 }}>
              <iframe
                ref={iframeRef}
                src={fullPreviewUrl}
                className="w-full h-full border-none"
                title="Story preview"
              />
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={fullPreviewUrl}
            className="w-full h-full border-none"
            title="Story preview"
          />
        )}
      </div>
    </div>
  );
}
