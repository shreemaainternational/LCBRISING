import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentMember, isAdminRole } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { sendWhatsApp } from '@/lib/whatsapp';
import { writeAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  segment: z.enum(['all_active', 'by_district', 'by_club', 'officers_only']),
  segment_id: z.string().uuid().optional(),
  channel: z.enum(['email', 'whatsapp', 'both']),
  subject: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(5000),
  dry_run: z.boolean().default(false),
});

type MemberRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  status: string | null;
};

export async function POST(req: NextRequest) {
  const actor = await getCurrentMember();
  if (!actor) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!isAdminRole(actor.role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }
  const { segment, segment_id, channel, subject, body, dry_run } = parsed.data;

  if ((channel === 'email' || channel === 'both') && !subject) {
    return NextResponse.json({ error: 'subject_required_for_email' }, { status: 400 });
  }

  const supa = createAdminClient();

  // Build the recipient query.
  let query = supa
    .from('members')
    .select('id, name, email, phone, whatsapp, status, club_id, district_id')
    .is('deleted_at', null)
    .eq('status', 'active');

  if (segment === 'by_district') {
    if (!segment_id) return NextResponse.json({ error: 'segment_id_required' }, { status: 400 });
    query = query.eq('district_id', segment_id);
  } else if (segment === 'by_club') {
    if (!segment_id) return NextResponse.json({ error: 'segment_id_required' }, { status: 400 });
    query = query.eq('club_id', segment_id);
  } else if (segment === 'officers_only') {
    query = query.in('role', ['admin', 'president', 'secretary', 'treasurer', 'officer']);
  }

  const { data: rows, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const recipients = (rows ?? []) as MemberRow[];

  if (dry_run) {
    return NextResponse.json({
      ok: true,
      dry_run: true,
      recipient_count: recipients.length,
      sample: recipients.slice(0, 5).map((r) => ({ name: r.name, email: r.email })),
    });
  }

  let emailSent = 0, emailFailed = 0;
  let waSent = 0, waFailed = 0;

  for (const r of recipients) {
    if ((channel === 'email' || channel === 'both') && r.email) {
      try {
        await sendEmail({ to: r.email, subject: subject!, html: body, text: body.replace(/<[^>]*>/g, '') });
        emailSent++;
      } catch {
        emailFailed++;
      }
    }
    const wa = r.whatsapp || r.phone;
    if ((channel === 'whatsapp' || channel === 'both') && wa) {
      try {
        await sendWhatsApp(wa, body.replace(/<[^>]*>/g, ''));
        waSent++;
      } catch {
        waFailed++;
      }
    }
  }

  await writeAudit({
    action: 'broadcast.send',
    entity: 'communications',
    payload: { segment, segment_id, channel, recipient_count: recipients.length, emailSent, emailFailed, waSent, waFailed },
    actor_user_id: actor.user_id ?? null,
    actor_member_id: actor.id,
  });

  return NextResponse.json({
    ok: true,
    recipient_count: recipients.length,
    emailSent, emailFailed, waSent, waFailed,
  });
}
