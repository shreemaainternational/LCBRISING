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
