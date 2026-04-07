'use client';

import { useState, useEffect, useRef } from 'react';
import type { StoryDetail } from '../types';

interface UsePreviewIframeOptions {
  story: StoryDetail | null;
  content: Record<string, any>;
  mobileWidth: number;
}

export function usePreviewIframe({ story, content, mobileWidth }: UsePreviewIframeOptions) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mobileViewWidth, setMobileViewWidth] = useState(mobileWidth);

  useEffect(() => {
    setMobileViewWidth(mobileWidth);
  }, [mobileWidth]);

  // Send live content updates to iframe preview
  useEffect(() => {
    if (!story || !iframeRef.current?.contentWindow) return;
    const timer = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        { action: 'input', story: { ...story, content } },
        '*',
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [content, story]);

  // Listen for messages from the iframe (click-to-edit, loaded)
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      const data = e.data;
      if (!data || typeof data.action !== 'string') return;
      if (data.action === 'loaded' && story) {
        iframeRef.current?.contentWindow?.postMessage(
          { action: 'input', story: { ...story, content } },
          '*',
        );
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [story, content]);

  function startResize(side: 'left' | 'right', startX: number) {
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
  }

  return { iframeRef, mobileViewWidth, startResize };
}
