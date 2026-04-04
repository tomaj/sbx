'use client';

import { useState, useRef, useCallback } from 'react';
import { Monitor, Smartphone, Maximize2, Settings } from 'lucide-react';

type ViewMode = 'desktop' | 'mobile' | 'fullwidth';

interface PreviewFrameProps {
  url: string | undefined;
  className?: string;
  previewUrls?: Array<{ name: string; location: string }>;
  spaceId?: string;
  onUrlChange?: (url: string) => void;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
}

export function PreviewFrame({
  url,
  className,
  previewUrls = [],
  spaceId,
  onUrlChange,
  iframeRef: externalIframeRef,
}: PreviewFrameProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [mobileViewWidth, setMobileViewWidth] = useState(360);
  const [showPreviewMenu, setShowPreviewMenu] = useState(false);
  const internalIframeRef = useRef<HTMLIFrameElement>(null);
  const iframeRef = externalIframeRef ?? internalIframeRef;

  const startResize = useCallback(
    (side: 'left' | 'right', startX: number) => {
      const startWidth = mobileViewWidth;
      function onMouseMove(e: MouseEvent) {
        const delta = e.clientX - startX;
        const newWidth =
          side === 'left' ? Math.max(240, startWidth - delta) : Math.max(240, startWidth + delta);
        setMobileViewWidth(Math.round(newWidth));
      }
      function onMouseUp() {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      }
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [mobileViewWidth],
  );

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${className ?? ''}`}>
      {/* Preview toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
        <div className="flex items-center gap-0.5 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('desktop')}
            title="Open desktop view"
            className={`p-1.5 rounded transition-colors ${viewMode === 'desktop' ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('mobile')}
            title="Open mobile view"
            className={`p-1.5 rounded transition-colors ${viewMode === 'mobile' ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('fullwidth')}
            title="Open full-width view"
            className={`p-1.5 rounded transition-colors ${viewMode === 'fullwidth' ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 text-xs text-gray-400 dark:text-gray-500 truncate text-center min-w-0">
          {url || 'No preview URL configured'}
        </div>

        {previewUrls.length > 0 && (
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowPreviewMenu((p) => !p)}
              title="Preview URL settings"
              className={`p-1.5 rounded transition-colors ${showPreviewMenu ? 'bg-gray-100 dark:bg-gray-800 text-gray-700' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              <Settings className="w-4 h-4" />
            </button>

            {showPreviewMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowPreviewMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Preview URLs
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {previewUrls.map((pu, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          onUrlChange?.(pu.location);
                          setShowPreviewMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${url === pu.location ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                      >
                        <div className="text-xs text-gray-800 dark:text-gray-200 truncate">
                          {pu.location}
                        </div>
                        <div className="text-xs text-gray-400">- {pu.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-800">
        {!url ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <Settings className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No preview URL configured</p>
            </div>
          </div>
        ) : viewMode === 'mobile' ? (
          <div className="flex h-full items-stretch justify-center py-4">
            <div className="flex items-center justify-center flex-shrink-0 w-8">
              <span
                className="text-[10px] text-gray-400 select-none whitespace-nowrap"
                style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
              >
                Mobile W:{mobileViewWidth}
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
                src={url}
                className="w-full h-full border-0"
                title="Preview"
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
        ) : (
          <iframe ref={iframeRef} src={url} className="w-full h-full border-0" title="Preview" />
        )}
      </div>
    </div>
  );
}
