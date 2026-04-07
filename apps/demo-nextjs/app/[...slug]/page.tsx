'use client';

import { useEffect, useRef, useState } from 'react';
import { StoryRenderer } from '@/components/StoryRenderer';
import { DebugBar } from '@/components/DebugBar';

const SBX_API = process.env.NEXT_PUBLIC_SBX_API_URL ?? 'http://localhost:3000';
const SBX_TOKEN = process.env.NEXT_PUBLIC_SBX_ACCESS_TOKEN ?? '';

interface StoryData {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  full_slug: string;
  content: Record<string, any>;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// Custom hook: listens for SBX Visual Editor postMessage events
function useSbxBridge(storyId: number | null, onUpdate: (story: StoryData) => void) {
  const cb = useRef(onUpdate);
  cb.current = onUpdate;

  useEffect(() => {
    if (!storyId) return;
    function handleMessage(e: MessageEvent) {
      const data = e.data;
      if (!data || typeof data !== 'object') return;
      if (data.action === 'input' && data.story?.id === storyId) {
        cb.current(data.story as StoryData);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [storyId]);
}

export default function StoryPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const [story, setStory] = useState<StoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [slug, setSlug] = useState<string>('');

  // Resolve async params (Next.js 15)
  useEffect(() => {
    params.then((p) => setSlug(p.slug?.join('/') ?? 'home'));
  }, [params]);

  // Detect visual editor preview mode
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setIsPreview(sp.has('_storyblok'));
  }, []);

  // Fetch story directly from SBX CDN API
  useEffect(() => {
    if (!slug) return;
    const version = isPreview ? 'draft' : 'published';
    setLoading(true);
    setError(null);
    fetch(`${SBX_API}/v2/cdn/stories/${slug}?token=${SBX_TOKEN}&version=${version}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(({ story: s }) => {
        setStory(s);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[SBX Demo] fetch error:', err);
        setError(`Failed to load: /${slug}`);
        setLoading(false);
      });
  }, [slug, isPreview]);

  // Live updates from Visual Editor (postMessage from SBX admin)
  useSbxBridge(story?.id ?? null, setStory);

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        {[40, 80, 60].map((w, i) => (
          <div
            key={i}
            style={{
              height: i === 0 ? '1.5rem' : '1rem',
              width: `${w}%`,
              background: '#e5e7eb',
              borderRadius: 4,
              marginBottom: '0.75rem',
              animation: 'sbx-pulse 1.5s ease-in-out infinite alternate',
            }}
          />
        ))}
        <style>{`@keyframes sbx-pulse { from { opacity:1 } to { opacity:0.3 } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', color: '#dc2626' }}>
        <strong>Error:</strong> {error}
        {!SBX_TOKEN && (
          <p style={{ marginTop: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
            Hint: Set <code>NEXT_PUBLIC_SBX_ACCESS_TOKEN</code> in .env.local
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      {story && <StoryRenderer story={story} />}
      <DebugBar story={story} isPreview={isPreview} slug={slug} />
    </>
  );
}
