import { NextResponse } from 'next/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac/guard';
import {
  isLionsApiConfigured, getLionsApiConfig,
  syncLionsDistricts, syncLionsClubs, syncLionsMembers, syncLionsAll,
} from '@/lib/oidc/lions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** GET /api/sync/lions — return adapter status. */
export async function GET() {
  const actor = await requirePermission('sync.configure');
  if (isGuardFailure(actor)) return actor;
  return NextResponse.json({
    configured: isLionsApiConfigured(),
    config: isLionsApiConfigured()
      ? {
          baseUrl: getLionsApiConfig()!.baseUrl,
          districtCode: getLionsApiConfig()!.districtCode ?? null,
          multipleDistrictCode: getLionsApiConfig()!.multipleDistrictCode ?? null,
        }
      : null,
  });
}

/** POST /api/sync/lions { entity: "all" | "district" | "club" | "member" } */
export async function POST(req: Request) {
  const actor = await requirePermission('sync.trigger');
  if (isGuardFailure(actor)) return actor;
  const body = await req.json().catch(() => ({})) as { entity?: string; districtCode?: string; clubId?: string };
  const entity = body.entity ?? 'all';

  if (entity === 'district') return NextResponse.json({ reports: [await syncLionsDistricts()] });
  if (entity === 'club')     return NextResponse.json({ reports: [await syncLionsClubs(body.districtCode)] });
  if (entity === 'member')   return NextResponse.json({ reports: [await syncLionsMembers(body.clubId)] });
  return NextResponse.json({ reports: await syncLionsAll() });
}
