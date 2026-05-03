import { env, integrations } from '@/lib/env';
import { sendWhatsApp } from '@/lib/whatsapp';

/**
 * Broadcast a WhatsApp message to a list of recipients.
 *
 * Tries the WhatsApp Cloud API (Meta) first if configured; falls back
 * to Twilio's WhatsApp transport (already wired in src/lib/whatsapp.ts).
 *
 * Returns one row per recipient so partial failures are visible.
 */
export interface BroadcastResult {
  to: string;
  ok: boolean;
  external_id?: string;
  error?: string;
}

export async function broadcastWhatsApp(args: {
  recipients: string[];
  body: string;
  media_url?: string;
}): Promise<BroadcastResult[]> {
  const useCloud = integrations.whatsappBusiness;
  const results: BroadcastResult[] = [];

  for (const to of args.recipients) {
    try {
      if (useCloud) {
        const id = await waCloudSend(to, args.body, args.media_url);
        results.push({ to, ok: true, external_id: id });
      } else {
        const msg = await sendWhatsApp(to, args.body);
        results.push({ to, ok: true, external_id: msg.sid });
      }
    } catch (err) {
      results.push({ to, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return results;
}

async function waCloudSend(to: string, body: string, mediaUrl?: string): Promise<string> {
  const url = `https://graph.facebook.com/v21.0/${env.WHATSAPP_BUSINESS_PHONE_ID}/messages`;
  const payload: Record<string, unknown> = mediaUrl
    ? {
        messaging_product: 'whatsapp', to,
        type: 'image',
        image: { link: mediaUrl, caption: body },
      }
    : {
        messaging_product: 'whatsapp', to,
        type: 'text',
        text: { body, preview_url: true },
      };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${env.WHATSAPP_BUSINESS_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`WhatsApp Cloud ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json() as { messages: { id: string }[] };
  return j.messages[0].id;
}
