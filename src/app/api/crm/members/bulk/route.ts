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
  // than failing the whole request.
  members: z.array(z.record(z.unknown())).min(1).max(MAX_ROWS),
});

type RowResult = {
  row: number;
  status: 'inserted' | 'skipped' | 'failed' | 'valid';
  name?: string;
  email?: string;
  reason?: string;
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }

  const actor = await requirePermission('member.create');
  if (isGuardFailure(actor)) return actor;

  const { members, dry_run } = parsed.data;

  // Validate every row first. Rows are numbered from 2 to line up with a
  // spreadsheet (row 1 is the header).
  const valid: { row: number; data: z.infer<typeof enterpriseMemberSchema> }[] = [];
  const results: RowResult[] = [];
  const seenEmails = new Set<string>();

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
    seenEmails.add(email);
    valid.push({ row: rowNum, data: { ...rowParsed.data, email } });
  });

  // Trusted admin write (gated by requirePermission). Service-role client so
  // the insert + read-back bypass RLS and avoid the members-policy recursion.
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  // Skip rows whose email already exists so we don't trip the unique
  // constraint mid-batch.
  if (valid.length) {
    const emails = valid.map((v) => v.data.email);
    const { data: existing } = await db.from('members').select('email').in('email', emails);
    const existingSet = new Set((existing ?? []).map((m) => String(m.email).toLowerCase().trim()));
    if (existingSet.size) {
      for (let i = valid.length - 1; i >= 0; i--) {
        if (existingSet.has(valid[i].data.email)) {
          results.push({ row: valid[i].row, status: 'skipped', name: valid[i].data.name, email: valid[i].data.email, reason: 'email already exists' });
          valid.splice(i, 1);
        }
      }
    }
  }

  // Dry run (preview): report what would happen without writing.
  if (dry_run) {
    for (const v of valid) {
      results.push({ row: v.row, status: 'valid', name: v.data.name, email: v.data.email });
    }
    results.sort((a, b) => a.row - b.row);
    return NextResponse.json({
      dry_run: true,
      total: members.length,
      to_insert: valid.length,
      rows: results,
    });
  }

  // Insert. A single batch insert would abort the whole set on one bad row, so
  // insert per-row to give precise feedback and let good rows through.
  let inserted = 0;
  for (const v of valid) {
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

  results.sort((a, b) => a.row - b.row);
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const failed = results.filter((r) => r.status === 'failed').length;

  await writeAudit({
    action: 'member.bulk_create',
    entity: 'member',
    actor_user_id: actor.user_id,
    actor_member_id: actor.member_id ?? null,
    payload: { total: members.length, inserted, skipped, failed },
  });

  return NextResponse.json({
    total: members.length,
    inserted,
    skipped,
    failed,
    rows: results,
  });
}
