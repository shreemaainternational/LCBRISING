import { env, integrations } from '@/lib/env';

const LI_API = 'https://api.linkedin.com/v2';

export async function postToLinkedIn(args: {
  caption: string;
  media_urls?: string[];
}): Promise<{ external_post_id: string; external_url: string }> {
  if (!integrations.linkedin) throw new Error('LinkedIn is not configured');
  const token = env.LINKEDIN_ACCESS_TOKEN!;
  const owner = env.LINKEDIN_ORGANIZATION_URN!;       // urn:li:organization:xxx

  // For the simple text + URL share path. Image upload is a 3-step
  // dance (register, upload, post) and is intentionally left as a
  // follow-up enhancement to keep this file focused.
  const body = {
    author: owner,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: args.caption },
        shareMediaCategory: args.media_urls && args.media_urls.length ? 'ARTICLE' : 'NONE',
        ...(args.media_urls?.length
          ? { media: args.media_urls.map((u) => ({ status: 'READY', originalUrl: u })) }
          : {}),
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };

  const res = await fetch(`${LI_API}/ugcPosts`, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${token}`,
      'content-type': 'application/json',
      'x-restli-protocol-version': '2.0.0',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LinkedIn ${res.status}: ${text.slice(0, 400)}`);
  }
  const json = await res.json() as { id: string };
  return {
    external_post_id: json.id,
    external_url: `https://www.linkedin.com/feed/update/${encodeURIComponent(json.id)}/`,
  };
}
