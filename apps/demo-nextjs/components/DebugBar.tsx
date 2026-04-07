'use client';

import { useEffect, useState } from 'react';

interface DebugBarProps {
  story: { id: number; name: string; full_slug: string; content: Record<string, any> } | null;
  isPreview: boolean;
  slug: string;
}

interface BridgeEvent {
  time: string;
  action: string;
  detail: string;
}

export function DebugBar({ story, isPreview, slug }: DebugBarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [bridgeLoaded, setBridgeLoaded] = useState(false);
  const [events, setEvents] = useState<BridgeEvent[]>([]);
  const [updateCount, setUpdateCount] = useState(0);

  // Listen for bridge events (postMessages from parent)
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      const data = e.data;
      if (!data || typeof data.action !== 'string') return;

      const time = new Date().toLocaleTimeString('sk', { hour12: false });
      let detail = '';

      if (data.action === 'input') {
        detail = `story.id=${data.story?.id}, content._uid=${data.story?.content?._uid}`;
        setUpdateCount((c) => c + 1);
      } else if (data.action === 'loaded') {
        setBridgeLoaded(true);
        detail = 'bridge ready';
      } else {
        detail = JSON.stringify(data).slice(0, 80);
      }

      setEvents((prev) => [{ time, action: data.action, detail }, ...prev].slice(0, 20));
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Check if StoryblokBridge is available
  useEffect(() => {
    const check = setInterval(() => {
      if ((window as any).StoryblokBridge) {
        setBridgeLoaded(true);
        clearInterval(check);
      }
    }, 300);
    return () => clearInterval(check);
  }, []);

  const styles = {
    bar: {
      position: 'fixed' as const,
      bottom: 0,
      left: 0,
      right: 0,
      background: '#18181b',
      color: '#e4e4e7',
      fontFamily: 'monospace',
      fontSize: '0.75rem',
      zIndex: 9999,
      borderTop: '2px solid #3f3f46',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '0.4rem 0.75rem',
      cursor: 'pointer',
    },
    badge: (color: string) => ({
      background: color,
      color: '#fff',
      padding: '0.1rem 0.4rem',
      borderRadius: '9999px',
      fontSize: '0.65rem',
      fontWeight: 700,
    }),
    events: {
      maxHeight: isOpen ? 160 : 0,
      overflow: 'hidden' as const,
      transition: 'max-height 0.2s ease',
      borderTop: isOpen ? '1px solid #3f3f46' : 'none',
    },
    eventRow: {
      display: 'flex',
      gap: '0.5rem',
      padding: '0.2rem 0.75rem',
      borderBottom: '1px solid #27272a',
      alignItems: 'center',
    },
  };

  return (
    <div style={styles.bar}>
      <div style={styles.header} onClick={() => setIsOpen((o) => !o)}>
        <span style={{ color: '#a1a1aa' }}>SBX Debug</span>

        <span style={styles.badge(isPreview ? '#16a34a' : '#6b7280')}>
          {isPreview ? 'PREVIEW' : 'PUBLISHED'}
        </span>

        <span style={styles.badge(bridgeLoaded ? '#0ea5e9' : '#71717a')}>
          Bridge {bridgeLoaded ? 'ON' : 'OFF'}
        </span>

        {story && (
          <span style={{ color: '#a1a1aa' }}>
            {story.name} <span style={{ color: '#52525b' }}>#{story.id}</span>
          </span>
        )}

        {updateCount > 0 && (
          <span style={styles.badge('#f59e0b')}>
            {updateCount} update{updateCount !== 1 ? 's' : ''}
          </span>
        )}

        <span style={{ marginLeft: 'auto', color: '#52525b' }}>{isOpen ? '▼' : '▲'}</span>
      </div>

      <div style={styles.events}>
        {events.length === 0 ? (
          <div style={{ padding: '0.5rem 0.75rem', color: '#52525b' }}>
            No bridge events yet. Open story in SBX admin to start editing.
          </div>
        ) : (
          events.map((ev, i) => (
            <div key={i} style={styles.eventRow}>
              <span style={{ color: '#52525b', flexShrink: 0 }}>{ev.time}</span>
              <span
                style={styles.badge(
                  ev.action === 'input'
                    ? '#0ea5e9'
                    : ev.action === 'loaded'
                      ? '#16a34a'
                      : '#a855f7',
                )}
              >
                {ev.action}
              </span>
              <span
                style={{
                  color: '#a1a1aa',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {ev.detail}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
