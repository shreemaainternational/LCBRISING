import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireZoneChair } from '@/lib/zone-portal';
import { sendEmail } from '@/lib/email';
import { pushToMember } from '@/lib/push';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const zone = await requireZoneChair();
  const { id } = await ctx.params;
  const db = createAdminClient();

  const { data: item } = await db.from('zone_action_items')
    .select('*, owner:members!zone_action_items_owner_member_id_fkey(name,email,whatsapp,id)')
    .eq('id', id).maybeSingle();
  if (!item || item.zone_id !== zone.zone.id) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const owner = item.owner as { name?: string; email?: string; whatsapp?: string; id?: string } | null;
  if (!owner) return NextResponse.json({ error: 'no_owner' }, { status: 400 });

  const channel = (item.remind_channel ?? 'email') as 'email' | 'whatsapp' | 'sms' | 'push';
  const subject = `[Zone Reminder] ${item.title}`;
  const dueLine = item.due_date ? `Due: ${item.due_date}.` : 'No due date set.';
  const body = `Hi ${owner.name ?? 'Lion'},\n\nThis is a reminder about the action item assigned to you by ${zone.zone.name}.\n\nTitle: ${item.title}\nStatus: ${item.status} · Priority: ${item.priority}\n${dueLine}\n\n${item.details ?? ''}\n\n— Sent automatically from Zone Control`;

  let delivered = false;
  let lastError: string | null = null;

  try {
    if (channel === 'email' && owner.email) {
      const html = `<pre style="font-family:sans-serif;white-space:pre-wrap">${body.replace(/</g, '&lt;')}</pre>`;
      const r = await sendEmail({ to: owner.email, subject, html, text: body }).catch((e) => ({ ok: false, error: String(e) }));
      delivered = !!(r && (r as { ok?: boolean }).ok);
      if (!delivered) lastError = String((r as { error?: unknown })?.error ?? 'send_failed');
    } else if (channel === 'push' && owner.id) {
      const r = await pushToMember(owner.id, { title: subject, body: item.title, url: '/m' });
      delivered = r.sent > 0;
      if (!delivered) lastError = `push_failed: ${r.failed}`;
    } else {
      lastError = `channel_unavailable:${channel}`;
    }
  } catch (e) {
    lastError = String(e);
  }

  await db.from('zone_action_items').update({
    last_reminder_at: new Date().toISOString(),
    reminder_count: (item.reminder_count ?? 0) + 1,
  }).eq('id', id);

  return NextResponse.json({ ok: delivered, channel, error: lastError });
}
