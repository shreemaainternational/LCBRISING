import { Resend } from 'resend';
import { env } from '@/lib/env';

let _client: Resend | null = null;

function client() {
  if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');
  if (!_client) _client = new Resend(env.RESEND_API_KEY);
  return _client;
}

export interface SendEmailArgs {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: { filename: string; content: Buffer | string }[];
}

export async function sendEmail({ to, subject, html, text, attachments }: SendEmailArgs) {
  const from = env.RESEND_FROM_EMAIL || 'noreply@lcbrising.org';
  const result = await client().emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
    attachments: attachments?.map((a) => ({
      filename: a.filename,
      content: typeof a.content === 'string' ? a.content : a.content.toString('base64'),
    })),
  });
  return result;
}

// ----- templates --------------------------------------------------
export const emailTemplates = {
  welcome(name: string) {
    return {
      subject: 'Welcome to Lions Club of Baroda Rising Star',
      html: layout(`
        <h2>Welcome aboard, ${escape(name)}!</h2>
        <p>Thank you for joining the Lions Club of Baroda Rising Star.
        Your account has been created. An officer will activate your
        membership shortly.</p>
        <p>"We Serve" — Lions International</p>
      `),
    };
  },
  duesReminder(name: string, amount: number, dueDate: string) {
    return {
      subject: `Reminder: dues of ₹${amount} due on ${dueDate}`,
      html: layout(`
        <h2>Hello ${escape(name)},</h2>
        <p>This is a friendly reminder that your dues of
        <strong>₹${amount}</strong> are due on <strong>${dueDate}</strong>.</p>
        <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/dues">Pay now</a></p>
      `),
    };
  },
  donationReceipt(donor: string, amount: number, receiptNo: string, receiptUrl?: string) {
    return {
      subject: `Donation receipt #${receiptNo}`,
      html: layout(`
        <h2>Thank you, ${escape(donor)}!</h2>
        <p>We gratefully acknowledge your contribution of
        <strong>₹${amount}</strong>. Your receipt number is
        <strong>${receiptNo}</strong>.</p>
        ${receiptUrl ? `<p><a href="${receiptUrl}">Download your receipt (PDF)</a></p>` : ''}
        <p>Your support powers our service projects across Vadodara.</p>
      `),
    };
  },
  eventReminder(name: string, eventTitle: string, when: string, location: string) {
    return {
      subject: `Reminder: ${eventTitle}`,
      html: layout(`
        <h2>Hi ${escape(name)},</h2>
        <p>This is a reminder for <strong>${escape(eventTitle)}</strong>.</p>
        <p><strong>When:</strong> ${when}<br/>
           <strong>Where:</strong> ${escape(location)}</p>
      `),
    };
  },
};

function layout(body: string) {
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#f6f6f6;padding:24px">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:auto;background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 4px rgba(0,0,0,0.05)">
      <tr><td>
        <div style="border-bottom:3px solid #fbbf24;padding-bottom:12px;margin-bottom:16px">
          <strong style="font-size:18px;color:#1e3a8a">🦁 Lions Club of Baroda Rising Star</strong>
        </div>
        ${body}
        <hr style="margin-top:24px;border:none;border-top:1px solid #eee"/>
        <p style="font-size:12px;color:#666">District 323-E · Vadodara · India</p>
      </td></tr>
    </table>
  </body></html>`;
}

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!),
  );
}
