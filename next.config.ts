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
    ];
  },
};

export default nextConfig;
