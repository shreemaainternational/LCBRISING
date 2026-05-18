import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface EntitySpec {
  table: string;
  select: string;
  filter?: (q: ReturnType<ReturnType<typeof createAdminClient>['from']>) => ReturnType<ReturnType<typeof createAdminClient>['from']>;
  columns: { key: string; label?: string; map?: (row: Record<string, unknown>) => string | number | null | undefined }[];
}

const SPECS: Record<string, EntitySpec> = {
  clubs: {
    table: 'clubs',
    select: 'id, name, club_number, district_id, zone_id, region_id, city, state, country, charter_date, latitude, longitude, health_score, deleted_at',
    columns: [
      { key: 'id' }, { key: 'name' }, { key: 'club_number' },
      { key: 'district_id' }, { key: 'zone_id' }, { key: 'region_id' },
      { key: 'city' }, { key: 'state' }, { key: 'country' },
      { key: 'charter_date' }, { key: 'latitude' }, { key: 'longitude' },
      { key: 'health_score' },
    ],
  },
  members: {
    table: 'members',
    select: 'id, name, email, phone, role, status, club_id, district_id, lions_member_id, lions_role, joined_at, deleted_at',
    columns: [
      { key: 'id' }, { key: 'lions_member_id' }, { key: 'name' },
      { key: 'email' }, { key: 'phone' }, { key: 'role' }, { key: 'lions_role' },
      { key: 'status' }, { key: 'club_id' }, { key: 'district_id' },
      { key: 'joined_at' },
    ],
  },
  officers: {
    table: 'club_officers',
    select: 'id, club_id, member_id, role, term_start, term_end, status, source_id',
    columns: [
      { key: 'id' }, { key: 'club_id' }, { key: 'member_id' },
      { key: 'role' }, { key: 'term_start' }, { key: 'term_end' },
      { key: 'status' }, { key: 'source_id' },
    ],
  },
  activities: {
    table: 'activities',
    select: 'id, club_id, title, category, date, beneficiaries, service_hours, amount_raised, location, approval_status, reported_to_district',
    columns: [
      { key: 'id' }, { key: 'club_id' }, { key: 'title' }, { key: 'category' },
      { key: 'date' }, { key: 'beneficiaries' }, { key: 'service_hours' },
      { key: 'amount_raised' }, { key: 'location' },
      { key: 'approval_status' }, { key: 'reported_to_district' },
    ],
  },
  dues: {
    table: 'dues_invoices',
    select: 'id, club_id, tier, period_label, amount, currency, due_date, status, paid_at, paid_amount',
    columns: [
      { key: 'id' }, { key: 'club_id' }, { key: 'tier' }, { key: 'period_label' },
      { key: 'amount' }, { key: 'currency' }, { key: 'due_date' },
      { key: 'status' }, { key: 'paid_at' }, { key: 'paid_amount' },
    ],
  },
  awards: {
    table: 'awards',
    select: 'id, member_id, club_id, type, level, awarded_on, citation, source_id',
    columns: [
      { key: 'id' }, { key: 'member_id' }, { key: 'club_id' },
      { key: 'type' }, { key: 'level' }, { key: 'awarded_on' },
      { key: 'citation' }, { key: 'source_id' },
    ],
  },
};

export async function GET(req: Request, { params }: { params: Promise<{ entity: string }> }) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  const { entity } = await params;
  const spec = SPECS[entity];
  if (!spec) return NextResponse.json({ error: 'unknown_entity', allowed: Object.keys(SPECS) }, { status: 400 });

  const db = createAdminClient();
  let q = db.from(spec.table).select(spec.select);
  // soft-delete filter where supported
  if (['clubs', 'members'].includes(entity)) q = q.is('deleted_at', null);
  const { data, error } = await q.limit(50000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  const headers = spec.columns.map((c) => c.label ?? c.key);
  const lines = [headers.join(',')];
  for (const row of rows) {
    const values = spec.columns.map((c) => {
      const v = c.map ? c.map(row) : row[c.key];
      if (v == null) return '';
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    });
    lines.push(values.join(','));
  }
  const csv = lines.join('\n');
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${entity}-${Date.now()}.csv"`,
    },
  });
}
