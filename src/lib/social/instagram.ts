import { env, integrations } from '@/lib/env';

const META_GRAPH = 'https://graph.facebook.com/v21.0';

export async function postToInstagram(args: {
  caption: string;
  media_urls: string[];
}): Promise<{ external_post_id: string; external_url: string }> {
  if (!integrations.instagram) throw new Error('Instagram is not configured');
  if (!args.media_urls.length) throw new Error('Instagram requires at least one image/video');

  const igId = env.INSTAGRAM_BUSINESS_ID!;
  const token = env.META_ACCESS_TOKEN!;

  // 1. create container(s)
  const containerIds: string[] = [];
  for (const url of args.media_urls) {
    const isVideo = /\.(mp4|mov|webm)$/i.test(url);
    const params: Record<string, string> = {
      access_token: token,
      caption: args.caption,
      ...(isVideo ? { media_type: 'REELS', video_url: url } : { image_url: url }),
    };
    if (args.media_urls.length > 1) {
      params.is_carousel_item = 'true';
      delete params.caption;
    }
    const r = await ig<{ id: string }>(`/${igId}/media`, params);
    containerIds.push(r.id);
  }

  // 2. for carousel, wrap in a parent container
  let publishContainer = containerIds[0];
  if (containerIds.length > 1) {
    const parent = await ig<{ id: string }>(`/${igId}/media`, {
      access_token: token,
      caption: args.caption,
      media_type: 'CAROUSEL',
      children: containerIds.join(','),
    });
    publishContainer = parent.id;
  }

  // 3. publish
  const pub = await ig<{ id: string }>(`/${igId}/media_publish`, {
    access_token: token, creation_id: publishContainer,
  });

  return {
    external_post_id: pub.id,
    external_url: `https://www.instagram.com/p/${pub.id}/`,
  };
}

async function ig<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${META_GRAPH}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: qs.toString(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Instagram ${res.status} ${path}: ${body.slice(0, 400)}`);
  }
  return res.json() as Promise<T>;
}
