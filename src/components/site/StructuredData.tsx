import { env } from '@/lib/env';

/**
 * Site-wide JSON-LD (Organization + WebSite) for rich search results.
 * Rendered once in the public layout. Values mirror the footer contact
 * block so search engines and the visible site agree.
 */
export function OrganizationJsonLd() {
  const site = env.NEXT_PUBLIC_SITE_URL;
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NGO',
        '@id': `${site}/#organization`,
        name: 'Lions Club of Baroda Rising Star',
        alternateName: 'LCB Rising Star',
        url: site,
        logo: `${site}/logo.png`,
        image: `${site}/og-default.png`,
        email: 'barodarisingstar@gmail.com',
        telephone: '+91-9712299333',
        slogan: 'We Serve',
        description:
          'Lions Club of Baroda Rising Star (District 3232 F1) — a service organisation in Vadodara dedicated to community service, healthcare, education, and disaster relief.',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '12-Kirtikunj Society, B/S Pragati Bank, Karelibaug',
          addressLocality: 'Vadodara',
          addressRegion: 'Gujarat',
          postalCode: '390018',
          addressCountry: 'IN',
        },
        areaServed: { '@type': 'City', name: 'Vadodara' },
        sameAs: [
          'https://facebook.com/lcbrisingstar',
          'https://instagram.com/lcbrisingstar',
          'https://x.com/lcbrisingstar',
          'https://linkedin.com/company/lcbrisingstar',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${site}/#website`,
        url: site,
        name: 'Lions Club of Baroda Rising Star',
        publisher: { '@id': `${site}/#organization` },
        inLanguage: 'en-IN',
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
