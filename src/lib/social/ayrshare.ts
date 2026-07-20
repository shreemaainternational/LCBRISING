import { env, integrations } from '@/lib/env';

/**
 * Ayrshare Social Media API client.
 *
 * One API key posts to every connected network (Facebook, Instagram,
 * LinkedIn, X, TikTok, …) through a single endpoint, so the club can
 * connect accounts once in the Ayrshare dashboard instead of wiring up
 * a Meta app + long-lived Page token + LinkedIn OAuth separately.
 *
 * Docs: https://www.ayrshare.com/docs — POST https://app.ayrshare.com/api/post
 *
 * Auth:  Authorization: Bearer <AYRSHARE_API_KEY>
 * Multi-profile (Business plan): additionally send Profile-Key: <key>.
 */
const AYRSHARE_API = 'https://app.ayrshare.com/api';

/** Ayrshare's platform identifiers for the networks this app posts to. */
export type AyrsharePlatform = 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'tiktok' | 'youtube';

/** Networks we can hand off to Ayrshare, mapped from our internal Platform. */
export const AYRSHARE_PLATFORMS: Record<'facebook' | 'instagram' | 'linkedin', AyrsharePlatform> = {
  facebook: 'facebook',
  instagram: 'instagram',
  linkedin: 'linkedin',
};

export function isAyrshareConfigured(): boolean {
  return integrations.ayrshare;
}

interface AyrsharePostId {
  platform: string;
  id?: string;
  postUrl?: string;
  status?: string;
}

interface AyrsharePostResponse {
  status?: string;                 // 'success' | 'error'
  id?: string;                     // Ayrshare's own post id (used for deletion)
  refId?: string;
  errors?: Array<{ platform?: string; message?: string; code?: number } | string>;
  postIds?: AyrsharePostId[];
}

export interface AyrshareResult {
  external_post_id: string;
  external_url: string;
}

/**
 * Publish (or schedule) a post to a single network via Ayrshare.
 *
 * @throws Error with a human-readable message when Ayrshare rejects the
 *         post or the targeted platform reports a failure.
 */
export async function postToAyrshare(args: {
  platform: keyof typeof AYRSHARE_PLATFORMS;
  caption: string;
  media_urls?: string[];
  /** ISO-8601 UTC timestamp; when set, Ayrshare schedules instead of posting now. */
  schedule_date?: string;
}): Promise<AyrshareResult> {
  if (!integrations.ayrshare) throw new Error('Ayrshare is not configured');
  const platform = AYRSHARE_PLATFORMS[args.platform];

  const payload: Record<string, unknown> = {
    post: args.caption,
    platforms: [platform],
  };
  if (args.media_urls && args.media_urls.length) payload.mediaUrls = args.media_urls;
  if (args.schedule_date) payload.scheduleDate = args.schedule_date;

  const headers: Record<string, string> = {
    'authorization': `Bearer ${env.AYRSHARE_API_KEY!}`,
    'content-type': 'application/json',
  };
  if (env.AYRSHARE_PROFILE_KEY) headers['profile-key'] = env.AYRSHARE_PROFILE_KEY;

  const res = await fetch(`${AYRSHARE_API}/post`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const json = (await res.json().catch(() => null)) as AyrsharePostResponse | null;

  if (!res.ok || !json) {
    const detail = json ? summarizeErrors(json) : `HTTP ${res.status}`;
    throw new Error(`Ayrshare ${res.status}: ${detail}`);
  }

  const entry = json.postIds?.find((p) => p.platform === platform) ?? json.postIds?.[0];

  // A 200 can still carry a per-platform failure — surface it as an error so
  // the queue marks the row failed rather than silently "published".
  if (json.status === 'error' || (entry && entry.status && entry.status !== 'success')) {
    throw new Error(`Ayrshare (${platform}): ${summarizeErrors(json)}`);
  }

  return {
    external_post_id: entry?.id ?? json.id ?? '',
    external_url: entry?.postUrl ?? '',
  };
}

function summarizeErrors(json: AyrsharePostResponse): string {
  if (json.errors && json.errors.length) {
    return json.errors
      .map((e) => (typeof e === 'string' ? e : e.message ?? JSON.stringify(e)))
      .join('; ')
      .slice(0, 400);
  }
  const failed = json.postIds?.filter((p) => p.status && p.status !== 'success');
  if (failed && failed.length) {
    return failed.map((p) => `${p.platform}: ${p.status}`).join('; ').slice(0, 400);
  }
  return json.status ?? 'unknown error';
}
