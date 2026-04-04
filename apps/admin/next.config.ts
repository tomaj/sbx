import type { NextConfig } from 'next';

// CDN and API origins from environment (with dev defaults)
const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL ?? 'http://localhost:3002';
const apiUrl = process.env.API_URL ?? 'http://localhost:3000';
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

// Content-Security-Policy header
// 'unsafe-inline' for styles is required by shadcn/ui + Tailwind CSS
// 'unsafe-eval' is restricted to dev only (Next.js HMR requires it)
const isDev = process.env.NODE_ENV !== 'production';

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self'${isDev ? " 'unsafe-eval' 'unsafe-inline'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${cdnUrl}`,
  `connect-src 'self' ${apiUrl} ${appUrl} ${cdnUrl}`,
  "font-src 'self'",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspDirectives,
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/v2/cdn/:path*',
        destination: `${apiUrl}/v2/cdn/:path*`,
      },
    ];
  },
};

export default nextConfig;
