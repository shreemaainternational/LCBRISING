import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Lions Club of Baroda Rising Star',
    template: '%s · Lions Club Baroda Rising Star',
  },
  description:
    'Lions Club of Baroda Rising Star (District 323-E) — a service organisation in Vadodara dedicated to community service, healthcare, education, and disaster relief.',
  keywords: ['Lions Club', 'Baroda', 'Vadodara', 'NGO', 'Service', 'District 323-E', 'Donate', 'Charity'],
  openGraph: {
    title: 'Lions Club of Baroda Rising Star',
    description: 'We Serve. Join us in our mission to uplift communities across Vadodara.',
    type: 'website',
    locale: 'en_IN',
    siteName: 'Lions Club Baroda Rising Star',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
