/**
 * Rule-based + AI-assisted duplicate detection for the members table.
 *
 * Two phases:
 *   1. Cheap rule-based candidate pair generation (shared email,
 *      same phone, normalised-name + same club). Cost: one query.
 *   2. (Optional) OpenAI binary classifier per candidate pair to
 *      separate "real duplicate" from "two people with the same
 *      common name". Returns confidence 0-100 + a short reason.
 */
import { createAdminClient } from '@/lib/supabase/server';
import { env, integrations } from '@/lib/env';

export interface MemberLite {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  club_id: string | null;
  lions_member_id: string | null;
  joined_at: string | null;
}

export interface CandidatePair {
  left: MemberLite;
  right: MemberLite;
  matchers: string[];   // ['email', 'phone', 'name+club']
  ruleScore: number;    // 0-100 rule-based confidence
}

export interface AiVerdict {
  isDuplicate: boolean;
  confidence: number;
  reason: string;
}

export interface DuplicateRow extends CandidatePair {
  ai: AiVerdict | null;
}

function norm(s: string | null): string {
  return (s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
}
function normPhone(s: string | null): string {
  return (s ?? '').replace(/[^\d]/g, '').replace(/^91/, '').replace(/^0/, '');
}

export async function findCandidatePairs(limit = 1000): Promise<CandidatePair[]> {
  const db = createAdminClient();
  const { data } = await db.from('members')
    .select('id, name, email, phone, club_id, lions_member_id, joined_at')
    .is('deleted_at', null)
    .limit(limit);
  const rows = (data ?? []) as MemberLite[];

  const byEmail = new Map<string, MemberLite[]>();
  const byPhone = new Map<string, MemberLite[]>();
  const byNameClub = new Map<string, MemberLite[]>();

  for (const r of rows) {
    const e = norm(r.email);
    if (e) bucket(byEmail, e, r);
    const p = normPhone(r.phone);
    if (p.length >= 7) bucket(byPhone, p, r);
    const nc = `${norm(r.name)}|${r.club_id ?? ''}`;
    if (norm(r.name).length >= 4) bucket(byNameClub, nc, r);
  }

  const pairs = new Map<string, CandidatePair>();
  for (const [key, bucketRows] of byEmail.entries()) addPairs(pairs, bucketRows, 'email', 90, key);
  for (const [key, bucketRows] of byPhone.entries()) addPairs(pairs, bucketRows, 'phone', 80, key);
  for (const [key, bucketRows] of byNameClub.entries()) addPairs(pairs, bucketRows, 'name+club', 55, key);

  return Array.from(pairs.values()).sort((a, b) => b.ruleScore - a.ruleScore);
}

function bucket(map: Map<string, MemberLite[]>, key: string, row: MemberLite) {
  if (!map.has(key)) map.set(key, []);
  map.get(key)!.push(row);
}

function addPairs(out: Map<string, CandidatePair>, rows: MemberLite[], matcher: string, score: number, _key: string) {
  if (rows.length < 2) return;
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i], b = rows[j];
      const k = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
      const existing = out.get(k);
      if (existing) {
        if (!existing.matchers.includes(matcher)) existing.matchers.push(matcher);
        existing.ruleScore = Math.min(100, existing.ruleScore + Math.floor(score / 3));
      } else {
        out.set(k, { left: a, right: b, matchers: [matcher], ruleScore: score });
      }
    }
  }
}

const AI_PROMPT = `You are a deduplication referee for a Lions Club member database.
Given two member records, return JSON: {"isDuplicate": true|false, "confidence": 0-100, "reason": "<= 1 short sentence"}.
Treat slightly different spellings, nicknames, formatted phones, and email aliases as the same person if other evidence supports it.
Treat two unrelated people who happen to share a common name (like "Suresh Patel") as NOT duplicates unless email or phone also match.
Be conservative — when in doubt, return isDuplicate: false.`;

export async function aiClassifyPair(pair: CandidatePair): Promise<AiVerdict | null> {
  if (!integrations.openai) return null;
  const body = JSON.stringify({
    model: env.OPENAI_MODEL ?? 'gpt-4o-mini',
    temperature: 0.1,
    max_tokens: 120,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: AI_PROMPT },
      { role: 'user', content: JSON.stringify({
          matched_on: pair.matchers,
          left: { name: pair.left.name, email: pair.left.email, phone: pair.left.phone, club_id: pair.left.club_id, lions_member_id: pair.left.lions_member_id },
          right: { name: pair.right.name, email: pair.right.email, phone: pair.right.phone, club_id: pair.right.club_id, lions_member_id: pair.right.lions_member_id },
        }) },
    ],
  });
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
      body,
    });
    if (!res.ok) return null;
    const j = await res.json();
    const text = j.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(text) as Partial<AiVerdict>;
    return {
      isDuplicate: !!parsed.isDuplicate,
      confidence: Math.max(0, Math.min(100, Number(parsed.confidence ?? 0))),
      reason: String(parsed.reason ?? '').slice(0, 200),
    };
  } catch {
    return null;
  }
}

export async function scanDuplicates(opts: { ai?: boolean; max?: number } = {}): Promise<DuplicateRow[]> {
  const candidates = await findCandidatePairs();
  const limit = Math.min(opts.max ?? 30, candidates.length);
  const slice = candidates.slice(0, limit);
  if (!opts.ai) return slice.map((p) => ({ ...p, ai: null }));
  const enriched: DuplicateRow[] = [];
  for (const p of slice) {
    const ai = await aiClassifyPair(p);
    enriched.push({ ...p, ai });
  }
  return enriched;
}
