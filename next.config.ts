import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  serverExternalPackages: ['pdfkit'],
  async redirects() {
    return [
      { source: '/admin/dashboard', destination: '/admin', permanent: true },
      { source: '/admin/dashboard/:path*', destination: '/admin/:path*', permanent: true },
      // Collapse accidental /admin/admin/* → /admin/* (typed URLs, stale bookmarks).
      { source: '/admin/admin', destination: '/admin', permanent: true },
      { source: '/admin/admin/:path*', destination: '/admin/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
