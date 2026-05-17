import { NextResponse } from 'next/server';
import { requireDistrictGovernor } from '@/lib/district-portal';
import { runDistrictMasterSync } from '@/lib/district-sync';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET() {
  const ctx = await requireDistrictGovernor();
  const { data } = await createAdminClient()
    .from('district_sync_runs')
    .select('id, status, trigger, started_at, finished_at, duration_ms, totals, reports, error_message')
    .eq('district_id', ctx.district.id)
    .order('started_at', { ascending: false })
    .limit(25);
  return NextResponse.json({ runs: data ?? [] });
}

export async function POST() {
  const ctx = await requireDistrictGovernor();
  const result = await runDistrictMasterSync({
    districtId: ctx.district.id,
    triggeredBy: ctx.member.id,
    trigger: 'manual',
  });
  return NextResponse.json({ ok: true, result });
}
