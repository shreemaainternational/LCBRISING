import twilio from 'twilio';
import { env } from '@/lib/env';

let _client: ReturnType<typeof twilio> | null = null;

function client() {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials not configured');
  }
  if (!_client) _client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  return _client;
}

export async function sendWhatsApp(to: string, body: string) {
  const from = env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886';
  const recipient = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  return client().messages.create({ from, to: recipient, body });
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
};
