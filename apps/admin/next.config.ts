import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-auth'],
  async rewrites() {
    const apiUrl = process.env.API_URL ?? 'http://localhost:3000'
    return [
      {
        source: '/v2/cdn/:path*',
        destination: `${apiUrl}/v2/cdn/:path*`,
      },
    ]
  },
}

export default nextConfig
