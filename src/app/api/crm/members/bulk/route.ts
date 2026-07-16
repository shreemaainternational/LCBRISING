import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { describeSupabaseError } from '@/lib/supabase/errors';
import { requirePermission, isGuardFailure } from '@/lib/rbac';
import { enterpriseMemberSchema } from '@/lib/validation/schemas';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_ROWS = 2000;

const bulkSchema = z.object({
  dry_run: z.boolean().optional().default(false),
  // Each row is passed through the same enterprise member validation as the
  // single-add form, but partial — invalid rows are reported per-row rather
  // than failing the whole request. Rows may also carry club_name/district_name
  // (raw strings from the upload) so we can find-or-create the club.
  members: z.array(z.record(z.unknown())).min(1).max(MAX_ROWS),
});

type RowResult = {
  row: number;
  status: 'inserted' | 'updated' | 'skipped' | 'failed' | 'valid';
  name?: string;
  email?: string;
  reason?: string;
};

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }

  const actor = await requirePermission('member.create');
  if (isGuardFailure(actor)) return actor;

  const { members, dry_run } = parsed.data;

  // Trusted admin write (gated by requirePermission). Service-role client so
  // reads/writes bypass RLS and avoid the members-policy recursion.
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  // ---- Resolve clubs: match by name, creating any that don't exist yet, then
  // stamp club_id onto rows that only carried a club name. This is what makes
  // the roster group club-wise after a Lions import (whose "Account Name" is a
  // club that may not be in the CRM yet).
  let clubsCreated = 0;
  const needed = new Map<string, string>();      // lowerName -> display name
  const districtFor = new Map<string, string>(); // lowerName -> district
  for (const raw of members) {
    const cid = str(raw.club_id);
    const cname = str(raw.club_name);
    if (!cid && cname) {
      const key = cname.toLowerCase();
      if (!needed.has(key)) needed.set(key, cname);
      const dname = str(raw.district_name);
      if (dname && !districtFor.has(key)) districtFor.set(key, dname);
    }
  }
  if (needed.size) {
    const { data: existingClubs } = await db.from('clubs').select('id, name');
    const idByName = new Map<string, string>();
    for (const c of existingClubs ?? []) idByName.set(String(c.name).toLowerCase().trim(), c.id as string);

    for (const [key, display] of needed) {
      if (idByName.has(key) || dry_run) continue;
      const { data: created, error } = await db
        .from('clubs')
        .insert({ name: display, district: districtFor.get(key) ?? '' })
        .select('id')
        .single();
      if (!error && created) { idByName.set(key, created.id as string); clubsCreated++; }
    }

    for (const raw of members) {
      const cid = str(raw.club_id);
      const cname = str(raw.club_name);
      if (!cid && cname) {
        const id = idByName.get(cname.toLowerCase());
        if (id) raw.club_id = id;
      }
    }
  }

  // ---- Validate every row. Rows are numbered from 2 to line up with a
  // spreadsheet (row 1 is the header). club_name/district_name are stripped by
  // the schema; club_id (resolved above) is kept.
  const valid: { row: number; data: z.infer<typeof enterpriseMemberSchema> }[] = [];
  const results: RowResult[] = [];
  const seenEmails = new Set<string>();
  const seenLionsIds = new Set<string>();

  members.forEach((raw, i) => {
    const rowNum = i + 2;
    const rowParsed = enterpriseMemberSchema.safeParse(raw);
    if (!rowParsed.success) {
      const first = rowParsed.error.errors[0];
      const field = first?.path.join('.') || 'row';
      results.push({ row: rowNum, status: 'failed', reason: `${field}: ${first?.message ?? 'invalid'}` });
      return;
    }
    const email = rowParsed.data.email.toLowerCase().trim();
    if (seenEmails.has(email)) {
      results.push({ row: rowNum, status: 'skipped', name: rowParsed.data.name, email, reason: 'duplicate email in file' });
      return;
    }
    const lionsId = rowParsed.data.lions_member_id?.trim();
    if (lionsId && seenLionsIds.has(lionsId)) {
      results.push({ row: rowNum, status: 'skipped', name: rowParsed.data.name, email, reason: 'duplicate membership number in file' });
      return;
    }
    seenEmails.add(email);
    if (lionsId) seenLionsIds.add(lionsId);
    valid.push({ row: rowNum, data: { ...rowParsed.data, email } });
  });

  // ---- Reconcile against existing members. A member that already exists is
  // skipped, but if it has no club yet and this upload resolved one, backfill
  // it (so re-uploading the Lions export links the 84 already-imported members
  // to their club). Both email and lions_member_id are UNIQUE.
  let updated = 0;
  if (valid.length) {
    const emails = valid.map((v) => v.data.email);
    const lionsIds = valid.map((v) => v.data.lions_member_id?.trim()).filter(Boolean) as string[];

    const [{ data: byEmail }, byLions] = await Promise.all([
      db.from('members').select('id, email, club_id').in('email', emails),
      lionsIds.length
        ? db.from('members').select('id, lions_member_id, club_id').in('lions_member_id', lionsIds)
        : Promise.resolve({ data: [] as { id: string; lions_member_id: string | null; club_id: string | null }[] }),
    ]);

    const emailMap = new Map<string, { id: string; club_id: string | null }>();
    for (const m of byEmail ?? []) emailMap.set(String(m.email).toLowerCase().trim(), { id: m.id as string, club_id: (m.club_id as string | null) ?? null });
    const lionsMap = new Map<string, { id: string; club_id: string | null }>();
    for (const m of byLions.data ?? []) {
      const k = String(m.lions_member_id).trim();
      if (k) lionsMap.set(k, { id: m.id as string, club_id: (m.club_id as string | null) ?? null });
    }

    for (let i = valid.length - 1; i >= 0; i--) {
      const v = valid[i];
      const lionsId = v.data.lions_member_id?.trim();
      const ex = emailMap.get(v.data.email) ?? (lionsId ? lionsMap.get(lionsId) : undefined);
      if (!ex) continue;

      // Backfill a missing club link on the existing member.
      if (!dry_run && v.data.club_id && !ex.club_id) {
        const { error } = await db.from('members').update({ club_id: v.data.club_id }).eq('id', ex.id);
        if (!error) {
          results.push({ row: v.row, status: 'updated', name: v.data.name, email: v.data.email, reason: 'club linked' });
          updated++;
          valid.splice(i, 1);
          continue;
        }
      }
      results.push({
        row: v.row, status: 'skipped', name: v.data.name, email: v.data.email,
        reason: emailMap.has(v.data.email) ? 'email already exists' : 'membership number already exists',
      });
      valid.splice(i, 1);
    }
  }

  // Dry run (preview): report what would happen without writing.
  if (dry_run) {
    for (const v of valid) results.push({ row: v.row, status: 'valid', name: v.data.name, email: v.data.email });
    results.sort((a, b) => a.row - b.row);
    return NextResponse.json({ dry_run: true, total: members.length, to_insert: valid.length, clubs_created: clubsCreated, rows: results });
  }

  // Insert. A single batch insert would abort the whole set on one bad row, so
  // insert per-row to give precise feedback and let good rows through.
  let inserted = 0;
  for (const v of valid) {
    const { error } = await db.from('members').insert(v.data).select('id').single();
    if (error) {
      const msg = /duplicate key|unique/i.test(error.message) ? 'already exists' : describeSupabaseError(error.message);
      results.push({ row: v.row, status: 'failed', name: v.data.name, email: v.data.email, reason: msg });
    } else {
      inserted++;
      results.push({ row: v.row, status: 'inserted', name: v.data.name, email: v.data.email });
    }
  }

  results.sort((a, b) => a.row - b.row);
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const failed = results.filter((r) => r.status === 'failed').length;

  await writeAudit({
    action: 'member.bulk_create',
    entity: 'member',
    actor_user_id: actor.user_id,
    actor_member_id: actor.member_id ?? null,
    payload: { total: members.length, inserted, updated, skipped, failed, clubs_created: clubsCreated },
  });

  return NextResponse.json({
    total: members.length,
    inserted,
    updated,
    skipped,
    failed,
    clubs_created: clubsCreated,
    rows: results,
  });
}
