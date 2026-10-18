/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
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
    return [
      {
        // Only stream SSE events directly; all other API routes pass strictly through Server Actions
        source: '/api/sse/:path*',
        destination: process.env.API_INTERNAL_URL
          ? `${process.env.API_INTERNAL_URL}/sse/:path*`
          : 'http://127.0.0.1:4000/api/sse/:path*',
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/auth/login',
        permanent: true,
      },
      {
        source: '/register',
        destination: '/auth/register',
        permanent: true,
      },
      {
        source: '/forgot-password',
        destination: '/auth/forgot-password',
        permanent: true,
      },
      {
        source: '/reset-password',
        destination: '/auth/reset-password',
        permanent: true,
      },
      {
        source: '/verify',
        destination: '/auth/verify',
        permanent: true,
      },
      {
        source: '/resend-verification',
        destination: '/auth/resend-verification',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
