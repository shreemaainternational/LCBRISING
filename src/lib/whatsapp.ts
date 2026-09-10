import twilio from 'twilio';
import { env, integrations } from '@/lib/env';

/**
 * True when at least one WhatsApp transport is configured — the Meta
 * WhatsApp Business Cloud API (preferred) or Twilio (fallback). Callers
 * that gate on WhatsApp availability should use this rather than probing
 * a single provider, so configuring either one is enough.
 */
export const whatsAppConfigured = integrations.whatsappBusiness || integrations.twilio;

export type WhatsAppSendResult = { sid: string; provider: 'cloud' | 'twilio' };

let _client: ReturnType<typeof twilio> | null = null;

function client() {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials not configured');
  }
  if (!_client) _client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  return _client;
}

/** Send via the Meta WhatsApp Business Cloud API (Graph). */
async function sendViaCloud(to: string, body: string): Promise<WhatsAppSendResult> {
  const recipient = to.replace(/^whatsapp:/i, '').trim();
  const url = `https://graph.facebook.com/v21.0/${env.WHATSAPP_BUSINESS_PHONE_ID}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.WHATSAPP_BUSINESS_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'text',
      text: { body, preview_url: true },
    }),
  });
  if (!res.ok) {
    throw new Error(`WhatsApp Cloud ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const j = (await res.json()) as { messages: { id: string }[] };
  return { sid: j.messages[0].id, provider: 'cloud' };
}

/** Send via Twilio's WhatsApp transport. */
async function sendViaTwilio(to: string, body: string): Promise<WhatsAppSendResult> {
  const from = env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886';
  const recipient = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const msg = await client().messages.create({ from, to: recipient, body });
  return { sid: msg.sid, provider: 'twilio' };
}

/**
 * Send a WhatsApp message using whichever transport is configured —
 * Meta WhatsApp Business Cloud first (the app's preferred provider), then
 * Twilio. Throws if neither is configured so callers can surface it.
 */
export async function sendWhatsApp(to: string, body: string): Promise<WhatsAppSendResult> {
  if (integrations.whatsappBusiness) return sendViaCloud(to, body);
  if (integrations.twilio) return sendViaTwilio(to, body);
  throw new Error(
    'No WhatsApp transport configured — set WhatsApp Business Cloud (WHATSAPP_BUSINESS_TOKEN + WHATSAPP_BUSINESS_PHONE_ID) or Twilio (TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN) credentials.',
  );
}

export const whatsappTemplates = {
  duesReminder(name: string, amount: number, dueDate: string) {
    return `🦁 Lions Club Baroda Rising Star\n\nHi ${name}, your dues of ₹${amount} are due on ${dueDate}. Pay at: ${process.env.NEXT_PUBLIC_SITE_URL}/admin/dues`;
  },
  donationThankYou(donor: string, amount: number, receiptNo: string) {
    return `🦁 Lions Club Baroda Rising Star\n\nThank you ${donor}! Your donation of ₹${amount} has been received. Receipt #${receiptNo}.`;
  },
  eventReminder(name: string, eventTitle: string, when: string, location: string) {
    return `🦁 Lions Club Baroda Rising Star\n\nHi ${name}, reminder for "${eventTitle}" on ${when} at ${location}. See you there!`;
  },
  anniversary(name: string, years: number) {
    return `🦁 Lions Club Baroda Rising Star\n\nCongratulations ${name}! 🎉 ${
      years > 0
        ? `Today marks ${years} year${years === 1 ? '' : 's'} of your service with us.`
        : 'Happy anniversary of your Lions journey!'
    } Thank you for living "We Serve".`;
  },
  paymentRequest(name: string, amount: number, invoiceNo: string, payUrl: string) {
    return [
      '🦁 Lions Club Baroda Rising Star',
      '',
      `Dear ${name},`,
      'Please complete your payment using the link below.',
      '',
      `Amount: ₹${amount}`,
      `Invoice: ${invoiceNo}`,
      '',
      `Pay now: ${payUrl}`,
      '',
      'Scan the QR on the page using PhonePe, GPay, Paytm or any UPI app.',
      'Thank you.',
    ].join('\n');
  },
  paymentReceived(name: string, amount: number, invoiceNo: string, receiptNo: string) {
    return [
      '🦁 Lions Club Baroda Rising Star',
      '',
      `Thank you ${name}.`,
      `Your payment of ₹${amount} for invoice ${invoiceNo} is confirmed.`,
      `Receipt: ${receiptNo}`,
    ].join('\n');
  },
};
