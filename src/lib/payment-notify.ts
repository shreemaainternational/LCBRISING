import { sendWhatsApp, whatsappTemplates } from '@/lib/whatsapp';
import { sendEmail } from '@/lib/email';
import { env, integrations } from '@/lib/env';

export interface ConfirmationInput {
  invoiceId: string;
  invoiceNo: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  amount: number;
  receiptNo: string;
  paymentId: string;
}

export interface ChannelResult {
  ok: boolean;
  skipped?: string;
  error?: string;
}

export async function sendPaymentConfirmation(input: ConfirmationInput): Promise<{
  whatsapp: ChannelResult;
  email: ChannelResult;
}> {
  const receiptUrl = `${env.NEXT_PUBLIC_SITE_URL}/api/payments/${input.paymentId}/receipt`;

  const whatsappResult: ChannelResult = await (async () => {
    if (!input.customerPhone) return { ok: false, skipped: 'no phone' };
    if (!integrations.twilio) return { ok: false, skipped: 'twilio not configured' };
    try {
      await sendWhatsApp(
        input.customerPhone,
        `${whatsappTemplates.paymentReceived(
          input.customerName,
          input.amount,
          input.invoiceNo,
          input.receiptNo,
        )}\n\nReceipt: ${receiptUrl}`,
      );
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'send failed' };
    }
  })();

  const emailResult: ChannelResult = await (async () => {
    if (!input.customerEmail) return { ok: false, skipped: 'no email' };
    if (!integrations.resend) return { ok: false, skipped: 'resend not configured' };
    try {
      await sendEmail({
        to: input.customerEmail,
        subject: `Payment received — receipt ${input.receiptNo}`,
        html: `
          <p>Dear ${input.customerName},</p>
          <p>We have received your payment of <strong>₹${input.amount}</strong> for invoice
          <strong>${input.invoiceNo}</strong>.</p>
          <p>Receipt number: <strong>${input.receiptNo}</strong></p>
          <p><a href="${receiptUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Download receipt (PDF)</a></p>
          <p>Thank you,<br/>Lions Club of Baroda Rising Star</p>
        `,
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'send failed' };
    }
  })();

  return { whatsapp: whatsappResult, email: emailResult };
}
