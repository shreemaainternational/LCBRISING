import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendEmail } from '@/lib/email';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().min(5).max(2000),
});

export async function POST(req: Request) {
  const limit = rateLimit(`contact:${clientIp(req)}`, 5, 60_000);
  if (!limit.ok) return NextResponse.json({ error: 'too many' }, { status: 429 });

  const isForm = req.headers.get('content-type')?.includes('application/x-www-form-urlencoded');
  const body = isForm
    ? Object.fromEntries((await req.formData()) as unknown as FormData)
    : await req.json().catch(() => null);

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  try {
    await sendEmail({
      to: process.env.ADMIN_BOOTSTRAP_EMAIL ?? 'contact@lcbrising.org',
      subject: `Contact form: ${parsed.data.name}`,
      html: `<p>From: ${parsed.data.name} (${parsed.data.email}, ${parsed.data.phone ?? '-'})</p>
             <p>${parsed.data.message.replace(/\n/g, '<br/>')}</p>`,
    });
  } catch (err) {
    console.error('contact send failed', err);
  }

  if (isForm) {
    return NextResponse.redirect(new URL('/contact?sent=1', req.url), 303);
  }
  return NextResponse.json({ ok: true });
}
