import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Blog/story/campaign cover images can be admin-entered URLs from any
      // host; allow optimisation of any HTTPS image so <Image> never 500s on
      // an unconfigured host. Sources are author-controlled, not visitor input.
      { protocol: 'https', hostname: '**' },
    ],
  },
  serverExternalPackages: ['pdfkit'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      {
        source: '/api/crm/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
      {
        source: '/api/auth/oidc/(.*)',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
      },
    ];
  },
  async redirects() {
    return [
      // Impact page was retired — send old links to the homepage (the same
      // stats live in the homepage banner). Data is untouched.
      { source: '/impact', destination: '/', permanent: true },
      { source: '/admin/dashboard', destination: '/admin', permanent: true },
      { source: '/admin/dashboard/:path*', destination: '/admin/:path*', permanent: true },
      // Collapse accidental /admin/admin/* → /admin/* (typed URLs, stale bookmarks).
      { source: '/admin/admin', destination: '/admin', permanent: true },
      { source: '/admin/admin/:path*', destination: '/admin/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
