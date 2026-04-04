import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow embedding in iframe from admin origin (for SBX admin visual editor)
  async headers() {
    const adminOrigin = process.env.ADMIN_URL ?? 'http://localhost:3001';
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: `ALLOW-FROM ${adminOrigin}` },
          { key: 'Content-Security-Policy', value: `frame-ancestors 'self' ${adminOrigin}` },
        ],
      },
    ];
  },
};

export default nextConfig;
