/**
 * Daily cron — scans all open zone_action_items whose due_date is
 * within their remind_when_due_in_days threshold and dispatches a
 * reminder via the configured channel. Idempotent: only fires when
 * last_reminder_at is older than 18 hours ago.
 */
import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { pushToMember } from '@/lib/push';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret') ?? req.headers.get('x-cron-secret');
  if (env.CRON_SECRET && secret !== env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const db = createAdminClient();
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);

  const { data: items } = await db.from('zone_action_items')
    .select('*, owner:members!zone_action_items_owner_member_id_fkey(name,email,whatsapp,id), zones(name)')
    .in('status', ['open', 'in_progress', 'blocked']);

  let scanned = 0, sent = 0, skipped = 0, failed = 0;
  const window18hAgo = Date.now() - 18 * 3600_000;

  for (const it of items ?? []) {
    scanned++;
    if (!it.due_date) { skipped++; continue; }
    const due = new Date(it.due_date as string);
    const daysOut = Math.round((due.getTime() - today.getTime()) / 86400_000);
    const remindWindow = it.remind_when_due_in_days ?? 1;
    if (daysOut > remindWindow) { skipped++; continue; }
    if (it.last_reminder_at && new Date(it.last_reminder_at as string).getTime() > window18hAgo) { skipped++; continue; }

    const owner = it.owner as { name?: string; email?: string; id?: string } | null;
    if (!owner) { skipped++; continue; }
    const zoneName = (it.zones as { name?: string } | null)?.name ?? 'Zone';

    const subject = daysOut < 0
      ? `[OVERDUE] ${it.title}`
      : daysOut === 0
        ? `[Due today] ${it.title}`
        : `[Due in ${daysOut}d] ${it.title}`;
    const body = `Hi ${owner.name ?? 'Lion'},\n\n${zoneName} reminder: action item "${it.title}" is ${daysOut < 0 ? 'overdue' : 'due soon'} (${it.due_date}).\n\n${it.details ?? ''}\n\n— Zone Control`;

    let ok = false;
    try {
      const ch = it.remind_channel ?? 'email';
      if (ch === 'email' && owner.email) {
        const html = `<pre style="font-family:sans-serif;white-space:pre-wrap">${body.replace(/</g, '&lt;')}</pre>`;
        const r = await sendEmail({ to: owner.email, subject, html, text: body });
        ok = !!(r && (r as { ok?: boolean }).ok);
      } else if (ch === 'push' && owner.id) {
        const r = await pushToMember(owner.id, { title: subject, body: it.title, url: '/m' });
        ok = r.sent > 0;
      }
    } catch { ok = false; }

    if (ok) sent++; else failed++;
    await db.from('zone_action_items').update({
      last_reminder_at: new Date().toISOString(),
      reminder_count: (it.reminder_count ?? 0) + 1,
    }).eq('id', it.id);
  }

  return NextResponse.json({ ok: true, scanned, sent, skipped, failed, runDate: todayISO });
}
