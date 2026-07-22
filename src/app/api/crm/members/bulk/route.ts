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
  // When set, this is an upload *into a specific club*: every row is forced
  // onto this club (the sheet's own club column is ignored) and members that
  // already exist are re-assigned to it instead of being skipped — so a club
  // roster can be (re)built even when the members were imported earlier
  // without a club.
  club_id: z.string().uuid().optional(),
  // Each row is passed through the same enterprise member validation as the
  // single-add form, but partial — invalid rows are reported per-row rather
  // than failing the whole request.
  members: z.array(z.record(z.unknown())).min(1).max(MAX_ROWS),
});

type RowResult = {
  row: number;
  status: 'inserted' | 'updated' | 'skipped' | 'failed' | 'valid';
  name?: string;
  email?: string;
  reason?: string;
};

// For scoped (into-a-club) uploads, a row may carry a membership number but no
// email — that still re-assigns an existing member (matched by number). Email
// stays required for brand-new members (enforced at insert time).
const scopedMemberSchema = enterpriseMemberSchema.extend({
  email: z.union([z.string().trim().email(), z.literal('')]).optional(),
});
type RowData = z.infer<typeof scopedMemberSchema>;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }

  const actor = await requirePermission('member.create');
  if (isGuardFailure(actor)) return actor;

  const { members, dry_run, club_id: scopeClubId } = parsed.data;

  // Validate every row first. Rows are numbered from 2 to line up with a
  // spreadsheet (row 1 is the header). Scoped uploads use a lenient schema so a
  // row with a membership number but no email can still update an existing member.
  const rowSchema = scopeClubId ? scopedMemberSchema : enterpriseMemberSchema;
  const valid: { row: number; data: RowData }[] = [];
  const results: RowResult[] = [];
  const seenEmails = new Set<string>();
  const seenLionsIds = new Set<string>();

  members.forEach((raw, i) => {
    const rowNum = i + 2;
    const rowParsed = rowSchema.safeParse(raw);
    if (!rowParsed.success) {
      const first = rowParsed.error.errors[0];
      const field = first?.path.join('.') || 'row';
      results.push({ row: rowNum, status: 'failed', reason: `${field}: ${first?.message ?? 'invalid'}` });
      return;
    }
    const data = rowParsed.data as RowData;
    const email = data.email ? data.email.toLowerCase().trim() : undefined;
    if (email) data.email = email; else delete data.email;
    const lionsId = data.lions_member_id?.trim();

    // A row needs at least one identity key to be actionable.
    if (!email && !lionsId) {
      results.push({ row: rowNum, status: 'failed', name: data.name, reason: 'email or membership number required' });
      return;
    }
    if (email && seenEmails.has(email)) {
      results.push({ row: rowNum, status: 'skipped', name: data.name, email, reason: 'duplicate email in file' });
      return;
    }
    if (lionsId && seenLionsIds.has(lionsId)) {
      results.push({ row: rowNum, status: 'skipped', name: data.name, email, reason: 'duplicate membership number in file' });
      return;
    }
    if (email) seenEmails.add(email);
    if (lionsId) seenLionsIds.add(lionsId);
    // Scoped upload: every row belongs to the target club, whatever the sheet says.
    valid.push({ row: rowNum, data: scopeClubId ? { ...data, club_id: scopeClubId } : data });
  });

  // Trusted admin write (gated by requirePermission). Service-role client so
  // the insert + read-back bypass RLS and avoid the members-policy recursion.
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  // Members that already exist (matched by email OR membership number). When
  // uploading into a club we re-assign these to it (below); otherwise they are
  // skipped so re-uploading the same Lions export stays idempotent.
  const toReassign: { row: number; id: string; data: RowData }[] = [];
  if (valid.length) {
    const emails = valid.map((v) => v.data.email).filter(Boolean) as string[];
    const lionsIds = valid.map((v) => v.data.lions_member_id?.trim()).filter(Boolean) as string[];

    const [byEmailRes, byLions] = await Promise.all([
      emails.length
        ? db.from('members').select('id, email').in('email', emails)
        : Promise.resolve({ data: [] as { id: string; email: string | null }[] }),
      lionsIds.length
        ? db.from('members').select('id, lions_member_id').in('lions_member_id', lionsIds)
        : Promise.resolve({ data: [] as { id: string; lions_member_id: string | null }[] }),
    ]);

    const emailToId = new Map((byEmailRes.data ?? []).map((m) => [String(m.email).toLowerCase().trim(), m.id]));
    const lionsToId = new Map((byLions.data ?? []).map((m) => [String(m.lions_member_id).trim(), m.id]).filter(([k]) => k) as [string, string][]);

    for (let i = valid.length - 1; i >= 0; i--) {
      const v = valid[i];
      const lionsId = v.data.lions_member_id?.trim();
      const existingId = (v.data.email ? emailToId.get(v.data.email) : undefined) ?? (lionsId ? lionsToId.get(lionsId) : undefined);
      if (!existingId) continue;

      if (scopeClubId) {
        // Uploading into a club → reconnect this member to it.
        toReassign.push({ row: v.row, id: existingId, data: v.data });
      } else {
        const reason = v.data.email && emailToId.has(v.data.email) ? 'email already exists' : 'membership number already exists';
        results.push({ row: v.row, status: 'skipped', name: v.data.name, email: v.data.email, reason });
      }
      valid.splice(i, 1);
    }
  }

  // Build the update payload for a re-assigned member: only the fields the
  // sheet actually provides (blanks are ignored, never nulled out), plus the
  // target club. Email is the match key, so it is never changed here.
  const UPDATABLE = ['name', 'phone', 'whatsapp', 'role', 'status', 'lions_role', 'lions_member_id', 'birthday'] as const;
  function updatePayload(data: RowData): Record<string, unknown> {
    const out: Record<string, unknown> = { club_id: scopeClubId };
    for (const k of UPDATABLE) {
      const v = (data as Record<string, unknown>)[k];
      if (v !== undefined && v !== null && v !== '') out[k] = v;
    }
    return out;
  }

  // Dry run (preview): report what would happen without writing.
  if (dry_run) {
    for (const v of valid) results.push({ row: v.row, status: 'valid', name: v.data.name, email: v.data.email });
    for (const u of toReassign) results.push({ row: u.row, status: 'updated', name: u.data.name, email: u.data.email });
    results.sort((a, b) => a.row - b.row);
    return NextResponse.json({
      dry_run: true,
      total: members.length,
      to_insert: valid.length,
      to_update: toReassign.length,
      rows: results,
    });
  }

  // Insert. A single batch insert would abort the whole set on one bad row, so
  // insert per-row to give precise feedback and let good rows through.
  let inserted = 0;
  for (const v of valid) {
    // A brand-new member needs an email (NOT NULL / UNIQUE). Email-less rows can
    // only ever update an existing member (matched by membership number above).
    if (!v.data.email) {
      results.push({ row: v.row, status: 'failed', name: v.data.name, reason: 'no email in sheet and no existing member with this membership number — add an email to create them' });
      continue;
    }
    const { data, error } = await db.from('members').insert(v.data).select('id').single();
    if (error) {
      const msg = /duplicate key|unique/i.test(error.message)
        ? 'already exists'
        : describeSupabaseError(error.message);
      results.push({ row: v.row, status: 'failed', name: v.data.name, email: v.data.email, reason: msg });
    } else {
      inserted++;
      results.push({ row: v.row, status: 'inserted', name: v.data.name, email: v.data.email });
      void data;
    }
  }

  // Re-assign existing members to the target club (scoped upload only),
  // refreshing whatever fields the sheet carried and re-linking club_id. Also
  // clears deleted_at so a previously-removed member returns to the roster.
  let updated = 0;
  for (const u of toReassign) {
    const { error } = await db.from('members').update({ ...updatePayload(u.data), deleted_at: null }).eq('id', u.id);
    if (error) {
      results.push({ row: u.row, status: 'failed', name: u.data.name, email: u.data.email, reason: describeSupabaseError(error.message) });
    } else {
      updated++;
      results.push({ row: u.row, status: 'updated', name: u.data.name, email: u.data.email });
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
    payload: { total: members.length, inserted, updated, skipped, failed, club_id: scopeClubId ?? null },
  });

  return NextResponse.json({
    total: members.length,
    inserted,
    updated,
    skipped,
    failed,
    rows: results,
  });
}
