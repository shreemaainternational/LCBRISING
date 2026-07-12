import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDuesKpis, getClubCompliance, getDuesAgeing } from '@/lib/dues/compliance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const [kpis, clubs, ageing] = await Promise.all([
    getDuesKpis(),
    getClubCompliance(),
    getDuesAgeing(),
  ]);
  return NextResponse.json({ ok: true, kpis, clubs, ageing });
}
