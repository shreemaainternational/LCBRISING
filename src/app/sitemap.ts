import type { MetadataRoute } from 'next';
import { env, isSupabaseConfigured } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 600;

async function dynamicEntries(): Promise<MetadataRoute.Sitemap> {
  if (!isSupabaseConfigured()) return [];
  const base = env.NEXT_PUBLIC_SITE_URL;
  const entries: MetadataRoute.Sitemap = [];
  try {
    const supabase = await createClient();
    const [{ data: posts }, { data: stories }, { data: campaigns }] = await Promise.all([
      supabase
        .from('blog_posts')
        .select('slug, updated_at')
        .eq('is_published', true)
        .is('deleted_at', null)
        .order('published_at', { ascending: false })
        .limit(500),
      supabase
        .from('stories')
        .select('slug, updated_at')
        .eq('is_published', true)
        .is('deleted_at', null)
        .limit(500),
      supabase.from('campaigns').select('slug, updated_at').eq('is_active', true).limit(200),
    ]);

    for (const p of (posts ?? []) as { slug: string; updated_at: string | null }[]) {
      if (!p.slug) continue;
      entries.push({
        url: `${base}/blog/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
    for (const s of (stories ?? []) as { slug: string; updated_at: string | null }[]) {
      if (!s.slug) continue;
      entries.push({
        url: `${base}/stories/${s.slug}`,
        lastModified: s.updated_at ? new Date(s.updated_at) : undefined,
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
    for (const c of (campaigns ?? []) as { slug: string; updated_at: string | null }[]) {
      if (!c.slug) continue;
      entries.push({
        url: `${base}/campaigns?focus=${c.slug}`,
        lastModified: c.updated_at ? new Date(c.updated_at) : undefined,
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  } catch {
    // Sitemap is best-effort.
  }
  return entries;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_SITE_URL;
  const now = new Date();
  const dynamic = await dynamicEntries();
  return [
    { url: `${base}/`,           lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${base}/about`,      lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/activities`, lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/stories`,    lastModified: now, changeFrequency: 'weekly',  priority: 0.85 },
    { url: `${base}/campaigns`,  lastModified: now, changeFrequency: 'weekly',  priority: 0.85 },
    { url: `${base}/impact`,     lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/blog`,       lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/events`,     lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/media`,      lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${base}/donate`,     lastModified: now, changeFrequency: 'monthly', priority: 0.95 },
    { url: `${base}/contact`,    lastModified: now, changeFrequency: 'yearly',  priority: 0.5 },
    ...dynamic,
  ];
}
