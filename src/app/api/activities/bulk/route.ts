import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { describeSupabaseError } from '@/lib/supabase/errors';
import { requireAdmin } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';
import { enqueueJob } from '@/lib/automation/engine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_ROWS = 2000;

// Per-row shape. Mirrors the single-add activity form but tolerant: invalid
// rows are reported individually instead of failing the whole upload.
const rowSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  beneficiaries: z.coerce.number().int().nonnegative().default(0),
  lion_members_count: z.coerce.number().int().nonnegative().default(0),
  service_hours: z.coerce.number().nonnegative().default(0),
  amount_raised: z.coerce.number().nonnegative().default(0),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  location: z.string().optional().nullable(),
  club_id: z.string().uuid().optional().nullable(),
});

const bulkSchema = z.object({
  dry_run: z.boolean().optional().default(false),
  activities: z.array(z.record(z.unknown())).min(1).max(MAX_ROWS),
});

type RowResult = {
  row: number;
  status: 'inserted' | 'skipped' | 'failed' | 'valid';
  title?: string;
  date?: string;
  reason?: string;
};

/** Idempotency key — one activity per (club, title, date, category). */
function key(clubId: string | null, title: string, date: string, category: string | null): string {
  return `${clubId ?? ''}|${title.toLowerCase().trim()}|${date}|${(category ?? '').toLowerCase().trim()}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }

  let actor;
  try { actor = await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }

  const { activities, dry_run } = parsed.data;

  // 1. Validate each row. Numbered from 2 to line up with a spreadsheet.
  const valid: { row: number; data: z.infer<typeof rowSchema> }[] = [];
  const results: RowResult[] = [];
  const seen = new Set<string>();

  activities.forEach((raw, i) => {
    const rowNum = i + 2;
    const rp = rowSchema.safeParse(raw);
    if (!rp.success) {
      const first = rp.error.errors[0];
      const field = first?.path.join('.') || 'row';
      results.push({ row: rowNum, status: 'failed', reason: `${field}: ${first?.message ?? 'invalid'}` });
      return;
    }
    const d = rp.data;
    const k = key(d.club_id ?? null, d.title, d.date, d.category ?? null);
    if (seen.has(k)) {
      results.push({ row: rowNum, status: 'skipped', title: d.title, date: d.date, reason: 'duplicate row in file' });
      return;
    }
    seen.add(k);
    valid.push({ row: rowNum, data: d });
  });

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  // 2. Skip rows already present so re-uploading the same export is idempotent.
  if (valid.length) {
    const titles = Array.from(new Set(valid.map((v) => v.data.title)));
    const { data: existing } = await db
      .from('activities')
      .select('title, date, category, club_id')
      .in('title', titles);

    const existingKeys = new Set(
      (existing ?? []).map((e) =>
        key(
          (e.club_id as string | null) ?? null,
          String(e.title),
          String(e.date),
          (e.category as string | null) ?? null,
        ),
      ),
    );

    for (let i = valid.length - 1; i >= 0; i--) {
      const v = valid[i];
      const k = key(v.data.club_id ?? null, v.data.title, v.data.date, v.data.category ?? null);
      if (existingKeys.has(k)) {
        results.push({ row: v.row, status: 'skipped', title: v.data.title, date: v.data.date, reason: 'already exists' });
        valid.splice(i, 1);
      }
    }
  }

  // 3. Dry run (preview): report what would happen without writing.
  if (dry_run) {
    for (const v of valid) {
      results.push({ row: v.row, status: 'valid', title: v.data.title, date: v.data.date });
    }
    results.sort((a, b) => a.row - b.row);
    return NextResponse.json({ dry_run: true, total: activities.length, to_insert: valid.length, rows: results });
  }

  // 4. Insert per-row for precise feedback (one bad row won't abort the batch).
  let inserted = 0;
  const insertedIds: string[] = [];
  for (const v of valid) {
    const payload = {
      title: v.data.title,
      description: v.data.description || null,
      category: v.data.category || null,
      beneficiaries: v.data.beneficiaries,
      lion_members_count: v.data.lion_members_count,
      service_hours: v.data.service_hours,
      amount_raised: v.data.amount_raised,
      date: v.data.date,
      location: v.data.location || null,
      club_id: v.data.club_id || null,
      reported_to_district: true,
    };
    const { data, error } = await db.from('activities').insert(payload).select('id').single();
    if (error) {
      results.push({ row: v.row, status: 'failed', title: v.data.title, date: v.data.date, reason: describeSupabaseError(error.message) });
    } else {
      inserted++;
      insertedIds.push(data.id as string);
      results.push({ row: v.row, status: 'inserted', title: v.data.title, date: v.data.date });
    }
  }

  results.sort((a, b) => a.row - b.row);
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const failed = results.filter((r) => r.status === 'failed').length;

  // Fire the on_activity_created automation for each new activity.
  for (const id of insertedIds) await enqueueJob('on_activity_created', { activity_id: id });

  await writeAudit({
    action: 'activity.bulk_create',
    entity: 'activity',
    actor_user_id: actor.user_id,
    actor_member_id: actor.id ?? null,
    payload: { total: activities.length, inserted, skipped, failed },
  });

  return NextResponse.json({ total: activities.length, inserted, skipped, failed, rows: results });
}
