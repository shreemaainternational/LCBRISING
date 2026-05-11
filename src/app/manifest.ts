import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lions Club Baroda Rising Star',
    short_name: 'LCBRS Pay',
    description: 'Pay invoices and view receipts for Lions Club of Baroda Rising Star.',
    start_url: '/portal',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#1a0f3e',
    theme_color: '#5f259f',
    icons: [
      {
        src: '/icons/icon-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    categories: ['finance', 'business'],
    shortcuts: [
      { name: 'Pay an invoice', url: '/invoices/lookup' },
      { name: 'My invoices', url: '/portal' },
    ],
  };
}
