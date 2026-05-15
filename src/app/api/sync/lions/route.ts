import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import {
  isLionsApiConfigured, getLionsApiConfig,
  syncLionsDistricts, syncLionsClubs, syncLionsMembers, syncLionsAll,
} from '@/lib/oidc/lions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** GET /api/sync/lions — return adapter status. */
export async function GET() {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
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
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  const body = await req.json().catch(() => ({})) as { entity?: string; districtCode?: string; clubId?: string };
  const entity = body.entity ?? 'all';

  if (entity === 'district') return NextResponse.json({ reports: [await syncLionsDistricts()] });
  if (entity === 'club')     return NextResponse.json({ reports: [await syncLionsClubs(body.districtCode)] });
  if (entity === 'member')   return NextResponse.json({ reports: [await syncLionsMembers(body.clubId)] });
  return NextResponse.json({ reports: await syncLionsAll() });
}
