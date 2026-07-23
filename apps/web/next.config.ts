import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@heavenly/types'],
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.convex.cloud' },
    ],
  },
}

export default nextConfig
