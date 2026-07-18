import { createClient, createAdminClient } from '@/lib/supabase/server';
import { findCandidatePairs } from '@/lib/sync/dedupe';

export type DedupeSide = { id: string; label: string; sub: string };
export type DedupePair = {
  entity: 'member' | 'activity' | 'event';
  keep: DedupeSide; drop: DedupeSide; matchers: string[]; score: number;
};
export type DedupeScan = { members: DedupePair[]; activities: DedupePair[]; events: DedupePair[] };

function norm(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
}
function dayOf(d: string | null | undefined): string {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? String(d).slice(0, 10) : dt.toISOString().slice(0, 10);
}

function pairsFromGroups<T extends { id: string }>(
  groups: Map<string, T[]>, entity: DedupePair['entity'],
  score: (r: T) => number, label: (r: T) => string, sub: (r: T) => string, matcher: string,
): DedupePair[] {
  const out: DedupePair[] = [];
  for (const rows of groups.values()) {
    if (rows.length < 2) continue;
    const sorted = [...rows].sort((a, b) => score(b) - score(a));
    const keep = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const drop = sorted[i];
      out.push({
        entity,
        keep: { id: keep.id, label: label(keep), sub: sub(keep) },
        drop: { id: drop.id, label: label(drop), sub: sub(drop) },
        matchers: [matcher], score: 85,
      });
    }
  }
  return out;
}

/** Scan members, activities and events for duplicates. */
export async function scanAllDuplicates(): Promise<DedupeScan> {
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  // Members — reuse the rule-based candidate finder.
  const memberPairs = await findCandidatePairs();
  const members: DedupePair[] = memberPairs.slice(0, 100).map((p) => {
    const scoreOf = (m: typeof p.left) => (m.lions_member_id ? 2 : 0) + (m.email ? 1 : 0) + (m.joined_at ? 0.5 : 0);
    const [keep, drop] = scoreOf(p.left) >= scoreOf(p.right) ? [p.left, p.right] : [p.right, p.left];
    return {
      entity: 'member' as const,
      keep: { id: keep.id, label: keep.name ?? keep.email ?? keep.id, sub: [keep.email, keep.lions_member_id].filter(Boolean).join(' · ') },
      drop: { id: drop.id, label: drop.name ?? drop.email ?? drop.id, sub: [drop.email, drop.lions_member_id].filter(Boolean).join(' · ') },
      matchers: p.matchers, score: p.ruleScore,
    };
  });

  // Activities — normalized title + date + club.
  const { data: acts } = await db.from('activities')
    .select('id, title, date, club_id, beneficiaries, amount_raised, photos');
  const actGroups = new Map<string, NonNullable<typeof acts>>();
  for (const a of acts ?? []) {
    if (!norm(a.title)) continue;
    const key = `${norm(a.title)}|${dayOf(a.date)}|${a.club_id ?? ''}`;
    if (!actGroups.has(key)) actGroups.set(key, []);
    actGroups.get(key)!.push(a);
  }
  const activities = pairsFromGroups(
    actGroups, 'activity',
    (a) => Number(a.beneficiaries ?? 0) + Number(a.amount_raised ?? 0) / 1000 + (Array.isArray(a.photos) ? a.photos.length : 0) * 5,
    (a) => a.title ?? a.id,
    (a) => `${dayOf(a.date)} · ${a.beneficiaries ?? 0} served`,
    'title+date+club',
  );

  // Events — normalized title + date + club.
  const { data: evts } = await db.from('events').select('id, title, date, club_id, location, capacity');
  const evtGroups = new Map<string, NonNullable<typeof evts>>();
  for (const e of evts ?? []) {
    if (!norm(e.title)) continue;
    const key = `${norm(e.title)}|${dayOf(e.date)}|${e.club_id ?? ''}`;
    if (!evtGroups.has(key)) evtGroups.set(key, []);
    evtGroups.get(key)!.push(e);
  }
  const events = pairsFromGroups(
    evtGroups, 'event',
    (e) => (e.location ? 1 : 0) + (e.capacity ? 1 : 0),
    (e) => e.title ?? e.id,
    (e) => `${dayOf(e.date)}${e.location ? ` · ${e.location}` : ''}`,
    'title+date+club',
  );

  return { members, activities, events };
}
