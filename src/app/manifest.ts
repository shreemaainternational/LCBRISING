import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lions CRM — Baroda Rising Star',
    short_name: 'Lions CRM',
    description:
      'Enterprise NGO CRM, reporting and on-the-go field tools for Lions International — members, clubs, districts, beneficiaries. District 3232 F1 · Vadodara.',
    start_url: '/m',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0b1220',
    theme_color: '#0B1F4D',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['productivity', 'business', 'social', 'finance'],
    lang: 'en',
    shortcuts: [
      { name: 'Log activity', short_name: 'Log activity', url: '/m/activities/new' },
      { name: 'QR check-in', short_name: 'Check-in', url: '/m/checkin' },
      { name: 'Add beneficiary', short_name: 'Beneficiary', url: '/m/beneficiaries/new' },
      { name: 'Reports', short_name: 'Reports', url: '/m/reports' },
    ],
  };
}
