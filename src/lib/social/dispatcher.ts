import { postToFacebook } from './facebook';
import { postToInstagram } from './instagram';
import { postToLinkedIn } from './linkedin';
import { broadcastWhatsApp } from './whatsapp_broadcast';

export type Platform = 'facebook' | 'instagram' | 'linkedin' | 'whatsapp';

export interface DispatchInput {
  caption: string;
  hashtags?: string[];
  media_urls?: string[];
  whatsapp_recipients?: string[];
}

export interface DispatchResult {
  platform: Platform;
  ok: boolean;
  external_post_id?: string;
  external_url?: string;
  error?: string;
}

export async function dispatchToPlatform(
  platform: Platform, input: DispatchInput,
): Promise<DispatchResult> {
  const caption = composeCaption(input.caption, input.hashtags, platform);

  try {
    switch (platform) {
      case 'facebook': {
        const r = await postToFacebook({ caption, media_urls: input.media_urls });
        return { platform, ok: true, ...r };
      }
      case 'instagram': {
        const r = await postToInstagram({ caption, media_urls: input.media_urls ?? [] });
        return { platform, ok: true, ...r };
      }
      case 'linkedin': {
        const r = await postToLinkedIn({ caption, media_urls: input.media_urls });
        return { platform, ok: true, ...r };
      }
      case 'whatsapp': {
        if (!input.whatsapp_recipients?.length) {
          return { platform, ok: false, error: 'No WhatsApp recipients' };
        }
        const results = await broadcastWhatsApp({
          recipients: input.whatsapp_recipients,
          body: caption,
          media_url: input.media_urls?.[0],
        });
        const failures = results.filter((r) => !r.ok);
        return {
          platform, ok: failures.length === 0,
          external_post_id: `wa-${Date.now()}`,
          error: failures.length ? `${failures.length} of ${results.length} failed` : undefined,
        };
      }
    }
  } catch (err) {
    return {
      platform, ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function composeCaption(caption: string, hashtags: string[] = [], platform: Platform) {
  const tags = hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`));
  switch (platform) {
    case 'instagram':
    case 'facebook':
      return tags.length ? `${caption}\n\n${tags.join(' ')}` : caption;
    case 'linkedin':
      return tags.length ? `${caption}\n\n${tags.join(' ')}` : caption;
    case 'whatsapp':
      return caption; // hashtags are noise on WhatsApp
  }
}
