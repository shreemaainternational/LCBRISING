import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Keep crawlers out of the API and every authenticated / operational
        // console — these aren't public content and only waste crawl budget.
        disallow: [
          '/admin',
          '/api',
          '/zone',
          '/district',
          '/region',
          '/multi-district',
          '/m',
          '/crm',
          '/login',
          '/portal',
          '/pay',
          '/invoices/lookup',
        ],
      },
    ],
    sitemap: `${env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
