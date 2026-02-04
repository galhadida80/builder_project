import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/:path*`,
      },
    ]
  },
  experimental: {
    optimizePackageImports: ['@mui/material', '@mui/icons-material'],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'vitest': false,
      'vitest/config': false,
    }
    return config
  },
}

export default withNextIntl(nextConfig)
