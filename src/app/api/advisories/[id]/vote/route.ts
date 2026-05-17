import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentMember } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  option_value: z.string().min(1).max(80),
  comment: z.string().max(400).optional(),
});

interface AdvisoryVotingRow {
  id: string;
  voting_enabled: boolean | null;
  voting_options: string[] | null;
  voting_closes_at: string | null;
  voting_allow_change: boolean | null;
  voting_anonymous: boolean | null;
}

interface VoteRow {
  option_value: string;
  member_id: string;
  members: { name?: string } | null;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentMember();
  if (!me) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });

  const db = createAdminClient();
  const { data: adv } = await db.from('advisories')
    .select('id, voting_enabled, voting_options, voting_closes_at, voting_allow_change, voting_anonymous')
    .eq('id', id).maybeSingle<AdvisoryVotingRow>();
  if (!adv) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!adv.voting_enabled) return NextResponse.json({ error: 'voting_disabled' }, { status: 400 });
  if (adv.voting_closes_at && new Date(adv.voting_closes_at) < new Date()) {
    return NextResponse.json({ error: 'voting_closed' }, { status: 400 });
  }
  const options = adv.voting_options ?? [];
  if (!options.includes(parsed.data.option_value)) {
    return NextResponse.json({ error: 'invalid_option' }, { status: 400 });
  }

  // Block update unless allow_change
  if (adv.voting_allow_change === false) {
    const { data: existing } = await db.from('advisory_votes')
      .select('id').eq('advisory_id', id).eq('member_id', me.id).maybeSingle();
    if (existing) return NextResponse.json({ error: 'already_voted' }, { status: 409 });
  }

  const { error } = await db.from('advisory_votes').upsert({
    advisory_id: id,
    member_id: me.id,
    club_id: me.club_id ?? null,
    option_value: parsed.data.option_value,
    comment: parsed.data.comment ?? null,
  }, { onConflict: 'advisory_id,member_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();
  const { data: adv } = await db.from('advisories')
    .select('id, voting_enabled, voting_options, voting_closes_at, voting_anonymous')
    .eq('id', id).maybeSingle<AdvisoryVotingRow>();
  if (!adv?.voting_enabled) return NextResponse.json({ tally: [], total: 0 });

  const { data: votes } = await db.from('advisory_votes')
    .select('option_value, member_id, members(name)')
    .eq('advisory_id', id);
  const rows = (votes ?? []) as unknown as VoteRow[];

  const counts = new Map<string, number>();
  for (const opt of (adv.voting_options ?? [])) counts.set(opt, 0);
  for (const v of rows) counts.set(v.option_value, (counts.get(v.option_value) ?? 0) + 1);

  const total = rows.length;
  const tally = Array.from(counts.entries()).map(([option, count]) => ({
    option, count, pct: total ? Math.round((count / total) * 100) : 0,
  }));

  const me = await getCurrentMember();
  let myVote: string | null = null;
  if (me) {
    const mine = rows.find((v) => v.member_id === me.id);
    myVote = mine?.option_value ?? null;
  }

  return NextResponse.json({
    tally,
    total,
    closesAt: adv.voting_closes_at,
    anonymous: adv.voting_anonymous,
    myVote,
    voters: adv.voting_anonymous ? null : rows.map((v) => ({
      name: v.members?.name ?? 'Member', option: v.option_value,
    })),
  });
}
