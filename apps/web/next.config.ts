import type { NextConfig } from 'next';

const isExport = process.env.OUTPUT_MODE === 'export';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: isExport ? 'export' : undefined,
  images: isExport ? { unoptimized: true } : undefined,
  typescript: {
    ignoreBuildErrors: true,
  },
  ...(isExport
    ? {}
    : {
        async headers() {
          return [
            {
              source: '/sw.js',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'no-cache, no-store, must-revalidate',
                },
                {
                  key: 'Content-Type',
                  value: 'application/javascript; charset=utf-8',
                },
              ],
            },
            {
              source: '/',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'public, max-age=0, must-revalidate',
                },
              ],
            },
          ];
        },
        async rewrites() {
          const apiTarget = process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000/api';
          return [
            {
              // Proxy all /api calls to NestJS API during dev
              source: '/api/:path*',
              destination: `${apiTarget}/:path*`,
            },
          ];
        },
      }),
};

export default nextConfig;
