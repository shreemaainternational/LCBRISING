/**
 * SMS adapter (Twilio).
 *
 * Mirrors src/lib/whatsapp.ts. Uses the same TWILIO_ACCOUNT_SID /
 * TWILIO_AUTH_TOKEN credentials and adds TWILIO_SMS_FROM for the
 * sender phone number (must be a Twilio-owned/verified E.164 number).
 *
 * `isSmsConfigured()` lets callers degrade gracefully when SMS isn't
 * provisioned (returns false and they can skip the SMS leg of a
 * multi-channel notification).
 */
import twilio from 'twilio';

let _client: ReturnType<typeof twilio> | null = null;

function client() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials not configured');
  }
  if (!_client) {
    _client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return _client;
}

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_SMS_FROM,
  );
}

function normalizeE164(to: string): string {
  const trimmed = to.trim();
  if (trimmed.startsWith('+')) return trimmed;
  // Bare digits: assume India (+91) if 10 digits, otherwise prepend +.
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

export async function sendSms(to: string, body: string): Promise<{ sid: string } | null> {
  if (!isSmsConfigured()) return null;
  const from = process.env.TWILIO_SMS_FROM!;
  const recipient = normalizeE164(to);
  const msg = await client().messages.create({ from, to: recipient, body });
  return { sid: msg.sid };
}

export const smsTemplates = {
  duesReminder(name: string, amount: number, dueDate: string) {
    return `LCBRS: Hi ${name}, dues of Rs.${amount} due on ${dueDate}. Pay: ${process.env.NEXT_PUBLIC_SITE_URL}/admin/dues`;
  },
  meetingReminder(eventTitle: string, when: string, location: string) {
    return `LCBRS: "${eventTitle}" on ${when} at ${location}. See you there.`;
  },
  paymentReceived(amount: number, receiptNo: string) {
    return `LCBRS: Payment of Rs.${amount} received. Receipt ${receiptNo}. Thank you.`;
  },
  otp(code: string) {
    return `LCBRS: Your verification code is ${code}. Valid for 10 minutes. Do not share.`;
  },
};
