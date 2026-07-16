import { NextResponse } from 'next/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac/guard';
import { loadLionsPortalSettings } from '@/lib/oidc/lions-portal-runtime';
import { isLionsPortalConfigured, syncLionsPortalDistricts } from '@/lib/oidc/lions-portal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** GET /api/sync/lions-portal — DG-login adapter status. */
export async function GET() {
  const actor = await requirePermission('sync.configure');
  if (isGuardFailure(actor)) return actor;
  await loadLionsPortalSettings(true);
  return NextResponse.json({ configured: isLionsPortalConfigured() });
}

/** POST /api/sync/lions-portal — sync district data using the DG login. */
export async function POST() {
  const actor = await requirePermission('sync.trigger');
  if (isGuardFailure(actor)) return actor;
  await loadLionsPortalSettings(true);
  const report = await syncLionsPortalDistricts();
  return NextResponse.json({ reports: [report] });
}
