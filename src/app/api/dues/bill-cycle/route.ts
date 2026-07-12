import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { runBillCycle, applyLateFees } from '@/lib/dues/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const schema = z.object({
  tier: z.enum(['club', 'district', 'international']),
  rate_card_code: z.string().optional(),
  district_id: z.string().uuid().optional(),
  club_id: z.string().uuid().optional(),
  period_label: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  due_date: z.string().optional(),
  force: z.boolean().default(false),
  fx_rate: z.number().optional(),
  apply_late_fees: z.boolean().default(false),
});

export async function POST(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });

  const report = await runBillCycle({
    tier: parsed.data.tier,
    rateCardCode: parsed.data.rate_card_code,
    districtId: parsed.data.district_id,
    clubId: parsed.data.club_id,
    periodLabel: parsed.data.period_label,
    periodStart: parsed.data.period_start,
    periodEnd: parsed.data.period_end,
    dueDate: parsed.data.due_date,
    force: parsed.data.force,
    fxRate: parsed.data.fx_rate,
  });

  let lateFees = null;
  if (parsed.data.apply_late_fees) lateFees = await applyLateFees();

  return NextResponse.json({ ok: true, report, lateFees });
}
