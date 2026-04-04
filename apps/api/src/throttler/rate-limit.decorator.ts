import { Throttle, SkipThrottle } from '@nestjs/throttler';

/**
 * Predefined rate limit presets for different endpoint categories.
 *
 * Usage:
 *   @RateLimit('auth')       // strict — login, register
 *   @RateLimit('mapi')       // standard — management API writes
 *   @RateLimit('cdn')        // relaxed — CDN reads, assets (high volume, low cost)
 *   @RateLimit('cdn-image')  // stricter — image transformation (CPU-intensive)
 *   @RateLimit('none')       // no throttling — health checks, metrics
 *
 * Without this decorator, the global defaults apply (20 req/s, 200 req/min).
 */
export function RateLimit(preset: 'auth' | 'mapi' | 'cdn' | 'cdn-image' | 'none') {
  switch (preset) {
    case 'auth':
      // Strict: login / token exchange — 5 per minute, 10 per 10 minutes per IP
      // Prevents brute-force while allowing legitimate retries (typos, password managers)
      return Throttle({ short: { limit: 5, ttl: 60000 }, medium: { limit: 10, ttl: 600000 } });

    case 'mapi':
      // Standard write operations (create, update, delete stories etc.)
      return Throttle({ short: { limit: 30, ttl: 1000 }, medium: { limit: 500, ttl: 60000 } });

    case 'cdn':
      // High-volume CDN reads — cheaper operations (DB lookup, cached response)
      return Throttle({ short: { limit: 100, ttl: 1000 }, medium: { limit: 3000, ttl: 60000 } });

    case 'cdn-image':
      // Image transformation via Sharp — CPU-intensive, tighter limit
      return Throttle({ short: { limit: 10, ttl: 1000 }, medium: { limit: 60, ttl: 10000 } });

    case 'none':
      // Skip throttling entirely — health checks, metrics, bridge script
      return SkipThrottle();
  }
}
