import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getInvoiceById } from '@/lib/invoices';
import { createAdminClient } from '@/lib/supabase/server';
import { sendWhatsApp, whatsappTemplates } from '@/lib/whatsapp';
import { sendEmail } from '@/lib/email';
import { env, integrations } from '@/lib/env';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let member;
  try {
    member = await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { channels?: ('whatsapp' | 'email')[] };
  const channels = body.channels ?? ['whatsapp', 'email'];

  const inv = await getInvoiceById(id);
  if (!inv) return NextResponse.json({ error: 'invoice not found' }, { status: 404 });

  const payUrl = `${env.NEXT_PUBLIC_SITE_URL}/pay/${inv.id}`;
  const results: Record<string, { ok: boolean; error?: string }> = {};

  if (channels.includes('whatsapp')) {
    if (!inv.customer_phone) {
      results.whatsapp = { ok: false, error: 'customer has no phone' };
    } else if (!integrations.twilio) {
      results.whatsapp = { ok: false, error: 'Twilio not configured' };
    } else {
      try {
        await sendWhatsApp(
          inv.customer_phone,
          whatsappTemplates.paymentRequest(inv.customer_name, Number(inv.amount), inv.invoice_no, payUrl),
        );
        results.whatsapp = { ok: true };
      } catch (e) {
        results.whatsapp = { ok: false, error: e instanceof Error ? e.message : 'send failed' };
      }
    }
  }

  if (channels.includes('email')) {
    if (!inv.customer_email) {
      results.email = { ok: false, error: 'customer has no email' };
    } else if (!integrations.resend) {
      results.email = { ok: false, error: 'Resend not configured' };
    } else {
      try {
        await sendEmail({
          to: inv.customer_email,
          subject: `Payment request: invoice ${inv.invoice_no} – ₹${inv.amount}`,
          html: `
            <p>Dear ${inv.customer_name},</p>
            <p>Please complete your payment of <strong>₹${inv.amount}</strong> for invoice
            <strong>${inv.invoice_no}</strong> using the link below.</p>
            <p><a href="${payUrl}" style="display:inline-block;background:#1e3a8a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Pay now</a></p>
            <p>Or copy this link: ${payUrl}</p>
            <p>Thank you,<br/>Lions Club of Baroda Rising Star</p>
          `,
        });
        results.email = { ok: true };
      } catch (e) {
        results.email = { ok: false, error: e instanceof Error ? e.message : 'send failed' };
      }
    }
  }

  const supabase = createAdminClient();
  await supabase.from('payment_audit_logs').insert({
    invoice_id: inv.id,
    actor_id: member.id,
    actor_kind: 'admin',
    action: 'invoice_sent',
    detail: { channels, results },
  });

  return NextResponse.json({ ok: true, pay_url: payUrl, results });
}
