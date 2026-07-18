import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { describeSupabaseError } from '@/lib/supabase/errors';
import { requirePermission, isGuardFailure } from '@/lib/rbac';
import { resolveOrBootstrapDefaultDistrict, resolveDefaultDistrictCode } from '@/lib/default-district';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_ROWS = 2000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const clubRowSchema = z.object({
  name: z.string().trim().min(2).max(200),
  club_number: z.string().trim().max(64).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  state: z.string().trim().max(120).optional().nullable(),
  country: z.string().trim().max(120).optional().nullable(),
  charter_date: z.union([z.string().regex(DATE), z.literal(''), z.null()]).optional(),
});

const bulkSchema = z.object({
  region: z.string().max(120).optional(),
  zone: z.string().max(120).optional(),
  clubs: z.array(z.record(z.unknown())).min(1).max(MAX_ROWS),
});

type Db = ReturnType<typeof createAdminClient>;

function codeAndName(raw: string, kind: 'Region' | 'Zone'): { code: string; name: string } {
  const name = raw.trim();
  const num = name.match(/\d+/)?.[0];
  const code = num ?? (name.toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 12) || kind.toUpperCase());
  return { code, name: /^\d+$/.test(name) ? `${kind} ${name}` : name };
}
async function findOrCreateRegion(db: Db, districtId: string, raw: string): Promise<string | null> {
  const { code, name } = codeAndName(raw, 'Region');
  const { data: e } = await db.from('regions').select('id').eq('district_id', districtId).eq('code', code).is('deleted_at', null).maybeSingle();
  if (e?.id) return e.id as string;
  const { data: c } = await db.from('regions').insert({ district_id: districtId, code, name }).select('id').single();
  return (c?.id as string) ?? null;
}
async function findOrCreateZone(db: Db, districtId: string, regionId: string | null, raw: string): Promise<string | null> {
  const { code, name } = codeAndName(raw, 'Zone');
  const { data: e } = await db.from('zones').select('id').eq('district_id', districtId).eq('code', code).is('deleted_at', null).maybeSingle();
  if (e?.id) { if (regionId) await db.from('zones').update({ region_id: regionId }).eq('id', e.id); return e.id as string; }
  const { data: c } = await db.from('zones').insert({ district_id: districtId, region_id: regionId, code, name }).select('id').single();
  return (c?.id as string) ?? null;
}

type RowResult = { row: number; status: 'inserted' | 'updated' | 'failed'; name?: string; reason?: string };

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });

  const actor = await requirePermission('club.create');
  if (isGuardFailure(actor)) return actor;

  const { clubs, region, zone } = parsed.data;
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  // Validate rows.
  const valid: { row: number; data: z.infer<typeof clubRowSchema> }[] = [];
  const results: RowResult[] = [];
  clubs.forEach((raw, i) => {
    const rowNum = i + 2;
    const p = clubRowSchema.safeParse(raw);
    if (!p.success) {
      const f = p.error.errors[0];
      results.push({ row: rowNum, status: 'failed', reason: `${f?.path.join('.') || 'row'}: ${f?.message ?? 'invalid'}` });
      return;
    }
    valid.push({ row: rowNum, data: p.data });
  });

  // Resolve district → region → zone once.
  const dres = await resolveOrBootstrapDefaultDistrict();
  const districtId = dres.id;
  const districtCode = await resolveDefaultDistrictCode(districtId ?? undefined);
  let regionId: string | null = null;
  let zoneId: string | null = null;
  if (districtId && region) regionId = await findOrCreateRegion(db, districtId, region);
  if (districtId && zone) zoneId = await findOrCreateZone(db, districtId, regionId, zone);

  // Existing clubs for dedupe (by LCI number and by lowercase name).
  const { data: existing } = await db.from('clubs').select('id, name, club_number');
  const idByNumber = new Map<string, string>();
  const idByName = new Map<string, string>();
  for (const c of existing ?? []) {
    if (c.club_number) idByNumber.set(String(c.club_number).trim(), c.id as string);
    idByName.set(String(c.name).toLowerCase().trim(), c.id as string);
  }

  let inserted = 0, updated = 0;
  for (const v of valid) {
    const d = v.data;
    const hierarchy: Record<string, unknown> = {};
    if (districtId) hierarchy.district_id = districtId;
    if (regionId) hierarchy.region_id = regionId;
    if (zoneId) hierarchy.zone_id = zoneId;

    const num = d.club_number?.trim();
    const existingId = (num && idByNumber.get(num)) || idByName.get(d.name.toLowerCase().trim());

    const fields: Record<string, unknown> = {
      name: d.name,
      district: districtCode || '',
      ...hierarchy,
    };
    if (num) fields.club_number = num;
    if (d.city) fields.city = d.city;
    if (d.state) fields.state = d.state;
    if (d.country) fields.country = d.country;
    if (d.charter_date) fields.charter_date = d.charter_date;

    if (existingId) {
      const { error } = await db.from('clubs').update(fields).eq('id', existingId);
      if (error) results.push({ row: v.row, status: 'failed', name: d.name, reason: describeSupabaseError(error.message) });
      else { updated++; results.push({ row: v.row, status: 'updated', name: d.name }); }
    } else {
      const { data: created, error } = await db.from('clubs').insert(fields).select('id').single();
      if (error || !created) {
        results.push({ row: v.row, status: 'failed', name: d.name, reason: describeSupabaseError(error?.message) });
      } else {
        inserted++;
        results.push({ row: v.row, status: 'inserted', name: d.name });
        idByName.set(d.name.toLowerCase().trim(), created.id as string);
        if (num) idByNumber.set(num, created.id as string);
      }
    }
  }

  results.sort((a, b) => a.row - b.row);
  const failed = results.filter((r) => r.status === 'failed').length;

  await writeAudit({
    action: 'club.bulk_create', entity: 'club',
    actor_user_id: actor.user_id, actor_member_id: actor.member_id ?? null,
    payload: { total: clubs.length, inserted, updated, failed, region: region ?? null, zone: zone ?? null },
  });

  return NextResponse.json({
    total: clubs.length, inserted, updated, failed,
    placement: (region || zone) ? { region: region ?? null, zone: zone ?? null } : null,
    rows: results,
  });
}
