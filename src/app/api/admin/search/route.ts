import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Result = { type: string; label: string; sub: string; href: string };

/** Cross-entity admin search (members, donations, activities, events, beneficiaries). */
export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }

  const q = (new URL(req.url).searchParams.get('q') ?? '').trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const db = createAdminClient();
  const like = `%${q.replace(/[%,]/g, '')}%`;

  // Each source is independent — a missing table must not sink the rest.
  const settled = await Promise.allSettled([
    db.from('members').select('id, name, email').or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`).is('deleted_at', null).limit(5),
    db.from('donations').select('id, donor_name, amount').or(`donor_name.ilike.${like},donor_email.ilike.${like}`).limit(5),
    db.from('activities').select('id, title').ilike('title', like).limit(5),
    db.from('events').select('id, title').ilike('title', like).limit(5),
    db.from('beneficiaries').select('id, full_name, city').or(`full_name.ilike.${like},phone.ilike.${like}`).is('deleted_at', null).limit(5),
  ]);

  const rows = (i: number) =>
    settled[i].status === 'fulfilled'
      ? ((settled[i] as PromiseFulfilledResult<{ data: Record<string, unknown>[] | null }>).value.data ?? [])
      : [];

  const results: Result[] = [
    ...rows(0).map((m) => ({ type: 'Member', label: String(m.name ?? '—'), sub: String(m.email ?? ''), href: '/admin/members' })),
    ...rows(1).map((d) => ({ type: 'Donation', label: String(d.donor_name ?? 'Anonymous'), sub: `₹${d.amount ?? 0}`, href: '/admin/donations' })),
    ...rows(2).map((a) => ({ type: 'Activity', label: String(a.title ?? '—'), sub: '', href: `/admin/activities/${a.id}` })),
    ...rows(3).map((e) => ({ type: 'Event', label: String(e.title ?? '—'), sub: '', href: '/admin/events' })),
    ...rows(4).map((b) => ({ type: 'Beneficiary', label: String(b.full_name ?? '—'), sub: String(b.city ?? ''), href: `/admin/beneficiaries/${b.id}` })),
  ];

  return NextResponse.json({ results });
}
