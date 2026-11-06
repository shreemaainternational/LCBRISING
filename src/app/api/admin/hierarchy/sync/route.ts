import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac';
import { writeAudit } from '@/lib/audit';
import {
  isMissingSchemaObject,
  loadClubPlacements,
  notifyAdmins,
  refreshDirectoryCaches,
} from '@/lib/org-hierarchy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NOT_ENABLED = 'Hierarchy sync needs migration 0088 to be applied to the database.';

type DriftRow = {
  entity: 'zone' | 'club' | 'member';
  entity_id: string;
  entity_name: string;
  field: string;
  current_value: string | null;
  derived_value: string | null;
  fixable: boolean;
};

/** GET — automatic mode preview: every place the stored hierarchy differs
 *  from what the approved structure implies, plus gaps a person must fix. */
export async function GET() {
  const actor = await requirePermission('district.update');
  if (isGuardFailure(actor)) return actor;

  const db = createAdminClient();
  const { data, error } = await db.rpc('org_hierarchy_drift');
  if (error) {
    return NextResponse.json(
      { error: isMissingSchemaObject(error) ? NOT_ENABLED : error.message },
      { status: isMissingSchemaObject(error) ? 503 : 500 },
    );
  }
  const rows = (data ?? []) as DriftRow[];
  return NextResponse.json({
    fixable: rows.filter((r) => r.fixable),
    needs_attention: rows.filter((r) => !r.fixable),
  });
}

const postSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('repair'), reason: z.string().trim().min(3).max(400) }),
  z.object({
    action: z.literal('move_zone'),
    zone_id: z.string().uuid(),
    to_region_id: z.string().uuid().nullable(),
    reason: z.string().trim().max(400).optional(),
    preview: z.boolean().optional(),
  }),
  z.object({
    action: z.literal('move_region'),
    region_id: z.string().uuid(),
    to_district_id: z.string().uuid(),
    reason: z.string().trim().max(400).optional(),
    preview: z.boolean().optional(),
  }),
]);

export async function POST(req: NextRequest) {
  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const perm = input.action === 'move_zone' ? 'zone.update' : input.action === 'move_region' ? 'region.update' : 'district.update';
  const actor = await requirePermission(perm);
  if (isGuardFailure(actor)) return actor;
  const db = createAdminClient();

  if (input.action === 'repair') {
    const { data, error } = await db.rpc('org_hierarchy_repair', {
      p_actor_member_id: actor.member_id ?? null,
      p_reason: input.reason,
    });
    if (error) {
      return NextResponse.json({ error: isMissingSchemaObject(error) ? NOT_ENABLED : error.message }, { status: 500 });
    }
    await writeAudit({
      action: 'hierarchy.repair', entity: 'hierarchy',
      actor_user_id: actor.user_id, actor_member_id: actor.member_id ?? null,
      payload: { reason: input.reason, result: data },
    });
    refreshDirectoryCaches();
    return NextResponse.json({ ok: true, result: data });
  }

  // Preview: which clubs and how many members the move affects, with each
  // club's placement before and after.
  const placements = await loadClubPlacements(db);
  const { data: memberRows } = await db.from('members').select('club_id').is('deleted_at', null);
  const membersByClub = new Map<string, number>();
  for (const m of (memberRows ?? []) as { club_id: string | null }[]) {
    if (m.club_id) membersByClub.set(m.club_id, (membersByClub.get(m.club_id) ?? 0) + 1);
  }

  if (input.action === 'move_zone') {
    const [{ data: zone }, { data: region }] = await Promise.all([
      db.from('zones').select('id, name, region_id').eq('id', input.zone_id).is('deleted_at', null).maybeSingle(),
      input.to_region_id
        ? db.from('regions').select('id, name, district_id').eq('id', input.to_region_id).is('deleted_at', null).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (!zone) return NextResponse.json({ error: 'Zone not found.' }, { status: 404 });
    if (input.to_region_id && !region) return NextResponse.json({ error: 'Region not found.' }, { status: 404 });
    const affected = placements.filter((p) => p.zone_id === zone.id);
    const preview = {
      zone: zone.name,
      to_region: region?.name ?? null,
      unchanged: (zone.region_id ?? null) === (input.to_region_id ?? null),
      clubs: affected.map((p) => ({ name: p.club_name, from_region: p.region_name, members: membersByClub.get(p.club_id) ?? 0 })),
      members: affected.reduce((n, p) => n + (membersByClub.get(p.club_id) ?? 0), 0),
      warnings: input.to_region_id ? [] : ['Removing the region leaves these clubs with their own region, if any.'],
    };
    if (input.preview) return NextResponse.json({ preview });
    if (!input.reason || input.reason.length < 3) return NextResponse.json({ error: 'A reason is required.', preview }, { status: 400 });

    const { data, error } = await db.rpc('move_zone_to_region', {
      p_zone_id: input.zone_id, p_region_id: input.to_region_id,
      p_reason: input.reason, p_actor_member_id: actor.member_id ?? null,
    });
    if (error) {
      return NextResponse.json({ error: isMissingSchemaObject(error) ? NOT_ENABLED : error.message }, { status: 500 });
    }
    await writeAudit({
      action: 'zone.move_region', entity: 'zone', entity_id: input.zone_id,
      actor_user_id: actor.user_id, actor_member_id: actor.member_id ?? null,
      payload: { from_region_id: zone.region_id, to_region_id: input.to_region_id, reason: input.reason, result: data, clubs: preview.clubs.length, members: preview.members },
    });
    refreshDirectoryCaches();
    await notifyAdmins(db, {
      title: 'Zone moved', body: `${zone.name} → ${region?.name ?? 'no region'} (${preview.clubs.length} clubs, ${preview.members} members)`,
      url: '/admin/hierarchy/sync', tag: `zone-move-${zone.id}`,
    });
    return NextResponse.json({ ok: true, result: data, preview });
  }

  // move_region
  const [{ data: region }, { data: district }, { data: zones }] = await Promise.all([
    db.from('regions').select('id, name, district_id').eq('id', input.region_id).is('deleted_at', null).maybeSingle(),
    db.from('districts').select('id, code, name').eq('id', input.to_district_id).maybeSingle(),
    db.from('zones').select('id, name').eq('region_id', input.region_id).is('deleted_at', null),
  ]);
  if (!region) return NextResponse.json({ error: 'Region not found.' }, { status: 404 });
  if (!district) return NextResponse.json({ error: 'District not found.' }, { status: 404 });
  const zoneIds = new Set((zones ?? []).map((z: { id: string }) => z.id));
  const affected = placements.filter((p) => p.zone_id && zoneIds.has(p.zone_id));
  const preview = {
    region: region.name,
    to_district: `District ${district.code}`,
    unchanged: region.district_id === district.id,
    zones: (zones ?? []).map((z: { name: string }) => z.name),
    clubs: affected.map((p) => ({ name: p.club_name, from_district: p.district_code, members: membersByClub.get(p.club_id) ?? 0 })),
    members: affected.reduce((n, p) => n + (membersByClub.get(p.club_id) ?? 0), 0),
    warnings: [] as string[],
  };
  if (input.preview) return NextResponse.json({ preview });
  if (!input.reason || input.reason.length < 3) return NextResponse.json({ error: 'A reason is required.', preview }, { status: 400 });

  const { data, error } = await db.rpc('move_region_to_district', {
    p_region_id: input.region_id, p_district_id: input.to_district_id,
    p_reason: input.reason, p_actor_member_id: actor.member_id ?? null,
  });
  if (error) {
    return NextResponse.json({ error: isMissingSchemaObject(error) ? NOT_ENABLED : error.message }, { status: 500 });
  }
  await writeAudit({
    action: 'region.move_district', entity: 'region', entity_id: input.region_id,
    actor_user_id: actor.user_id, actor_member_id: actor.member_id ?? null,
    payload: { from_district_id: region.district_id, to_district_id: input.to_district_id, reason: input.reason, result: data, zones: preview.zones.length, clubs: preview.clubs.length, members: preview.members },
  });
  refreshDirectoryCaches();
  await notifyAdmins(db, {
    title: 'Region moved', body: `${region.name} → District ${district.code} (${preview.clubs.length} clubs, ${preview.members} members)`,
    url: '/admin/hierarchy/sync', tag: `region-move-${region.id}`,
  });
  return NextResponse.json({ ok: true, result: data, preview });
}
