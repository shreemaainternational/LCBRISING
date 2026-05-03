import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.NEXT_PUBLIC_SITE_URL;
  const now = new Date();
  return [
    { url: `${base}/`,           lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${base}/about`,      lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/activities`, lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/events`,     lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/donate`,     lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/contact`,    lastModified: now, changeFrequency: 'yearly',  priority: 0.5 },
  ];
}
