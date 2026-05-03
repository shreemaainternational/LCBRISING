import { env, integrations } from '@/lib/env';

const META_GRAPH = 'https://graph.facebook.com/v21.0';

export interface PostResult {
  external_post_id: string;
  external_url: string;
}

/**
 * Post to a Facebook Page. Supports text-only, link, single photo,
 * and multi-photo album posts.
 */
export async function postToFacebook(args: {
  caption: string;
  media_urls?: string[];
  link?: string;
}): Promise<PostResult> {
  if (!integrations.facebook) throw new Error('Facebook is not configured');
  const pageId = env.FACEBOOK_PAGE_ID!;
  const token = env.META_ACCESS_TOKEN!;

  // Multi-photo: upload each photo unpublished, then create a multi-photo post
  if (args.media_urls && args.media_urls.length > 1) {
    const mediaIds: string[] = [];
    for (const url of args.media_urls) {
      const r = await fbFetch<{ id: string }>(
        `/${pageId}/photos`,
        { method: 'POST' },
        { url, published: 'false', access_token: token },
      );
      mediaIds.push(r.id);
    }
    const post = await fbFetch<{ id: string }>(
      `/${pageId}/feed`,
      { method: 'POST' },
      {
        message: args.caption,
        attached_media: JSON.stringify(mediaIds.map((id) => ({ media_fbid: id }))),
        access_token: token,
      },
    );
    return {
      external_post_id: post.id,
      external_url: `https://www.facebook.com/${post.id}`,
    };
  }

  // Single photo
  if (args.media_urls && args.media_urls.length === 1) {
    const post = await fbFetch<{ id: string; post_id: string }>(
      `/${pageId}/photos`,
      { method: 'POST' },
      { url: args.media_urls[0], caption: args.caption, access_token: token },
    );
    return {
      external_post_id: post.post_id ?? post.id,
      external_url: `https://www.facebook.com/${post.post_id ?? post.id}`,
    };
  }

  // Text-only / link post
  const post = await fbFetch<{ id: string }>(
    `/${pageId}/feed`,
    { method: 'POST' },
    { message: args.caption, link: args.link, access_token: token },
  );
  return {
    external_post_id: post.id,
    external_url: `https://www.facebook.com/${post.id}`,
  };
}

async function fbFetch<T>(path: string, init: RequestInit, params: Record<string, string | undefined>): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null) qs.set(k, v);
  const url = `${META_GRAPH}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...(init.headers ?? {}) },
    body: qs.toString(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta Graph ${res.status} ${path}: ${body.slice(0, 400)}`);
  }
  return res.json() as Promise<T>;
}
