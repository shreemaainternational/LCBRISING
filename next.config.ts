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
      { source: '/admin/dashboard', destination: '/admin', permanent: true },
      { source: '/admin/dashboard/:path*', destination: '/admin/:path*', permanent: true },
      // Collapse accidental /admin/admin/* → /admin/* (typed URLs, stale bookmarks).
      { source: '/admin/admin', destination: '/admin', permanent: true },
      { source: '/admin/admin/:path*', destination: '/admin/:path*', permanent: true },
      // Hand off the generic "make a payment" landing to the SMI Tech portal.
      { source: '/pay-now', destination: 'https://smi-tech.vercel.app/pay-now', permanent: false },
      { source: '/pay', destination: 'https://smi-tech.vercel.app/pay-now', permanent: false },
    ];
  },
};

export default nextConfig;
