import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { describeSupabaseError } from '@/lib/supabase/errors';
import { requirePermission, isGuardFailure } from '@/lib/rbac';
import { LIONS_ROLE_VALUES } from '@/lib/validation/schemas';
import { resolveOrBootstrapDefaultDistrict } from '@/lib/default-district';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_ROWS = 2000;

const bulkSchema = z.object({
  region: z.string().max(120).optional(),
  zone: z.string().max(120).optional(),
  officers: z.array(z.record(z.unknown())).min(1).max(MAX_ROWS),
});

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const officerRowSchema = z.object({
  lions_member_id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  email: z.string().email(),
  phone: z.string().trim().optional().nullable(),
  whatsapp: z.string().trim().optional().nullable(),
  role: z.enum(LIONS_ROLE_VALUES),
  title: z.string().trim().optional().nullable(),
  term_start: z.string().regex(DATE),
  term_end: z.union([z.string().regex(DATE), z.literal(''), z.null()]).optional(),
  club_name: z.string().trim().optional().nullable(),
  district_name: z.string().trim().optional().nullable(),
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

type RowResult = { row: number; status: 'inserted' | 'updated' | 'skipped' | 'failed'; name?: string; title?: string; reason?: string };

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }

  const actor = await requirePermission('officer.appoint');
  if (isGuardFailure(actor)) return actor;

  const { officers, region, zone } = parsed.data;
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  // Validate rows.
  const valid: { row: number; data: z.infer<typeof officerRowSchema> }[] = [];
  const results: RowResult[] = [];
  officers.forEach((raw, i) => {
    const rowNum = i + 2;
    const p = officerRowSchema.safeParse(raw);
    if (!p.success) {
      const f = p.error.errors[0];
      results.push({ row: rowNum, status: 'failed', reason: `${f?.path.join('.') || 'row'}: ${f?.message ?? 'invalid'}` });
      return;
    }
    valid.push({ row: rowNum, data: p.data });
  });

  // Resolve the district → region → zone hierarchy once, then find-or-create
  // each club referenced, placing it under the hierarchy.
  let districtId: string | null = null;
  let regionId: string | null = null;
  let zoneId: string | null = null;
  const clubNames = new Set(valid.map((v) => v.data.club_name?.trim()).filter(Boolean) as string[]);
  const districtText = valid.find((v) => v.data.district_name)?.data.district_name ?? '';
  if (clubNames.size || region || zone) {
    const dres = await resolveOrBootstrapDefaultDistrict();
    districtId = dres.id;
    if (districtId && region) regionId = await findOrCreateRegion(db, districtId, region);
    if (districtId && zone) zoneId = await findOrCreateZone(db, districtId, regionId, zone);
  }

  const clubIdByName = new Map<string, string>();
  if (clubNames.size) {
    const { data: existing } = await db.from('clubs').select('id, name');
    for (const c of existing ?? []) clubIdByName.set(String(c.name).toLowerCase().trim(), c.id as string);
    const extra: Record<string, unknown> = {};
    if (districtId) extra.district_id = districtId;
    if (regionId) extra.region_id = regionId;
    if (zoneId) extra.zone_id = zoneId;
    for (const name of clubNames) {
      const key = name.toLowerCase();
      if (clubIdByName.has(key)) continue;
      const { data: created } = await db.from('clubs').insert({ name, district: districtText || '', ...extra }).select('id').single();
      if (created) clubIdByName.set(key, created.id as string);
    }
    // Place existing clubs under the hierarchy too.
    const ids = Array.from(new Set(Array.from(clubNames).map((n) => clubIdByName.get(n.toLowerCase())).filter(Boolean) as string[]));
    if (ids.length && Object.keys(extra).length) await db.from('clubs').update(extra).in('id', ids);
  }

  // Resolve/create the member for each officer, then upsert the officer row.
  let inserted = 0, updated = 0, membersCreated = 0;
  const memberIdByLions = new Map<string, string>();

  for (const v of valid) {
    const d = v.data;
    const clubId = d.club_name ? clubIdByName.get(d.club_name.toLowerCase()) ?? null : null;
    const lid = d.lions_member_id.trim();

    // Resolve member: cache → by lions_member_id → by email → create.
    let memberId = memberIdByLions.get(lid) ?? null;
    if (!memberId) {
      const { data: byLions } = await db.from('members').select('id').eq('lions_member_id', lid).maybeSingle();
      memberId = (byLions?.id as string) ?? null;
    }
    if (!memberId) {
      const { data: byEmail } = await db.from('members').select('id').eq('email', d.email.toLowerCase()).maybeSingle();
      memberId = (byEmail?.id as string) ?? null;
    }
    if (!memberId) {
      const { data: created, error } = await db.from('members').insert({
        name: d.name, email: d.email.toLowerCase(), phone: d.phone || null, whatsapp: d.whatsapp || null,
        lions_member_id: lid, club_id: clubId, status: 'active', role: 'member',
      }).select('id').single();
      if (error || !created) {
        results.push({ row: v.row, status: 'failed', name: d.name, title: d.title ?? undefined, reason: `member: ${describeSupabaseError(error?.message)}` });
        continue;
      }
      memberId = created.id as string;
      membersCreated++;
    } else if (clubId) {
      // Link the member to the club if it isn't yet.
      await db.from('members').update({ club_id: clubId }).eq('id', memberId).is('club_id', null);
    }
    memberIdByLions.set(lid, memberId);

    const payload = {
      member_id: memberId, scope_kind: 'club', scope_id: clubId,
      role: d.role, term_start: d.term_start, term_end: d.term_end || null, status: 'active' as const,
    };
    const { data: existing } = await db.from('officers').select('id')
      .eq('member_id', memberId).eq('scope_kind', 'club').eq('role', d.role).eq('term_start', d.term_start).maybeSingle();
    if (existing?.id) {
      const { error } = await db.from('officers').update(payload).eq('id', existing.id);
      if (error) results.push({ row: v.row, status: 'failed', name: d.name, title: d.title ?? undefined, reason: describeSupabaseError(error.message) });
      else { updated++; results.push({ row: v.row, status: 'updated', name: d.name, title: d.title ?? undefined }); }
    } else {
      const { error } = await db.from('officers').insert(payload);
      if (error) results.push({ row: v.row, status: 'failed', name: d.name, title: d.title ?? undefined, reason: describeSupabaseError(error.message) });
      else { inserted++; results.push({ row: v.row, status: 'inserted', name: d.name, title: d.title ?? undefined }); }
    }
  }

  results.sort((a, b) => a.row - b.row);
  const failed = results.filter((r) => r.status === 'failed').length;

  await writeAudit({
    action: 'officer.bulk_appoint', entity: 'officer',
    actor_user_id: actor.user_id, actor_member_id: actor.member_id ?? null,
    payload: { total: officers.length, inserted, updated, failed, members_created: membersCreated, region: region ?? null, zone: zone ?? null },
  });

  return NextResponse.json({
    total: officers.length, inserted, updated, failed,
    members_created: membersCreated,
    placement: (region || zone) ? { region: region ?? null, zone: zone ?? null } : null,
    rows: results,
  });
}
