'use client';

import { ReactNode } from 'react';

// We load the SBX bridge script lazily when _storyblok_tk is in the URL.
// This runs once at module load (client-only, since 'use client').
if (typeof window !== 'undefined') {
  const sp = new URLSearchParams(window.location.search);
  if (sp.has('_storyblok_tk')) {
    const bridgeUrl =
      process.env.NEXT_PUBLIC_SBX_BRIDGE_URL ?? 'http://localhost:3000/bridge/v2-latest.js';
    if (!document.getElementById('sbx-bridge')) {
      const s = document.createElement('script');
      s.id = 'sbx-bridge';
      s.src = bridgeUrl;
      s.async = true;
      document.head.appendChild(s);
    }
  }
}

export function StoryblokProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
