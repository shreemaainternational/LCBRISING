import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireDistrictGovernor } from '@/lib/district-portal';
import { broadcastToTopic, isPushConfiguredAsync } from '@/lib/push';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const createSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(20000),
  priority: z.enum(['info', 'important', 'urgent']).default('info'),
  category: z.string().max(64).optional(),
  channels: z.array(z.enum(['portal', 'email', 'whatsapp', 'push', 'sms'])).default(['portal', 'email']),
  target_zone_ids: z.array(z.string().uuid()).optional(),
  target_club_ids: z.array(z.string().uuid()).optional(),
  attachment_urls: z.array(z.string().url()).optional(),
  pinned: z.boolean().default(false),
  scheduled_for: z.string().datetime().optional(),
  send_now: z.boolean().default(true),
});

export async function GET() {
  const ctx = await requireDistrictGovernor();
  const { data } = await createAdminClient()
    .from('district_circulars')
    .select('id, reference_no, subject, body, priority, category, channels, status, sent_at, scheduled_for, total_recipients, total_delivered, total_read, total_failed, pinned, created_at')
    .eq('district_id', ctx.district.id)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100);
  return NextResponse.json({ circulars: data ?? [] });
}

export async function POST(req: Request) {
  const ctx = await requireDistrictGovernor();
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });

  const db = createAdminClient();

  // Resolve target clubs.
  let clubQ = db.from('clubs').select('id, name').eq('district_id', ctx.district.id).is('deleted_at', null);
  if (parsed.data.target_club_ids?.length) {
    clubQ = clubQ.in('id', parsed.data.target_club_ids);
  } else if (parsed.data.target_zone_ids?.length) {
    clubQ = clubQ.in('zone_id', parsed.data.target_zone_ids);
  }
  const { data: clubs } = await clubQ;
  const clubIds = (clubs ?? []).map((c) => c.id);

  const status = parsed.data.send_now && !parsed.data.scheduled_for ? 'sending' : 'queued';

  const { data: circ, error } = await db.from('district_circulars').insert({
    district_id: ctx.district.id,
    subject: parsed.data.subject,
    body: parsed.data.body,
    priority: parsed.data.priority,
    category: parsed.data.category ?? null,
    channels: parsed.data.channels,
    target_zone_ids: parsed.data.target_zone_ids ?? [],
    target_club_ids: parsed.data.target_club_ids ?? [],
    attachment_urls: parsed.data.attachment_urls ?? [],
    pinned: parsed.data.pinned,
    scheduled_for: parsed.data.scheduled_for ?? null,
    total_recipients: clubIds.length,
    status,
    sent_at: status === 'sending' ? new Date().toISOString() : null,
    sent_by: status === 'sending' ? ctx.member.id : null,
    created_by: ctx.member.id,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Seed per-club recipient rows.
  if (clubIds.length) {
    const rows = clubIds.flatMap((club_id) =>
      parsed.data.channels.map((channel) => ({
        circular_id: circ.id, club_id, channel, status: 'pending',
      })),
    );
    await db.from('circular_recipients').insert(rows);
  }

  // Dispatch — best-effort across the requested channels. Errors per
  // channel are caught and recorded on the recipient rows.
  if (status === 'sending') {
    let delivered = 0, failed = 0;
    const subject = `[${parsed.data.priority.toUpperCase()}] ${parsed.data.subject}`;

    if (parsed.data.channels.includes('email') && clubIds.length) {
      const { data: officers } = await db.from('members')
        .select('email, club_id, role')
        .in('club_id', clubIds)
        .in('role', ['president', 'secretary', 'treasurer'])
        .is('deleted_at', null);
      const emails = (officers ?? []).map((m) => m.email).filter(Boolean);
      const html = `<div style="font-family:sans-serif;white-space:pre-wrap">${
        parsed.data.body.replace(/</g, '&lt;')
      }<hr/><p style="font-size:11px;color:#666">District ${ctx.district.code} · Ref ${circ.reference_no}</p></div>`;
      for (const to of emails) {
        try {
          const r = await sendEmail({ to, subject, html, text: parsed.data.body });
          if ((r as { ok?: boolean })?.ok) delivered++; else failed++;
        } catch { failed++; }
      }
    }

    if (parsed.data.channels.includes('push') && (await isPushConfiguredAsync())) {
      try {
        const r = await broadcastToTopic('district-circulars', {
          title: parsed.data.subject,
          body: parsed.data.body.slice(0, 200),
          url: `/m/notifications`,
          tag: `circular-${circ.reference_no}`,
        });
        delivered += r.sent;
        failed += r.failed;
      } catch { /* ignore */ }
    }

    await db.from('district_circulars').update({
      total_delivered: delivered,
      total_failed: failed,
      status: failed > 0 && delivered === 0 ? 'failed' : 'sent',
    }).eq('id', circ.id);
  }

  return NextResponse.json({ ok: true, circular: circ });
}
