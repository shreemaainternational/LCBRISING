import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  beneficiaries: z.number().int().nonnegative().optional(),
  service_hours: z.number().nonnegative().optional(),
  amount_raised: z.number().nonnegative().optional(),
  date: z.string().optional(),
  start_at: z.string().nullable().optional(),
  end_at: z.string().nullable().optional(),
  location: z.string().optional(),
  photos: z.array(z.string().url()).optional(),
  photo_captions: z.record(z.string(), z.string()).optional(),
  // Extended reporting columns
  service_category_id: z.string().uuid().nullable().optional(),
  csr_partner_id: z.string().uuid().nullable().optional(),
  event_id: z.string().uuid().nullable().optional(),
  lion_members_count: z.number().int().nonnegative().optional(),
  leo_members_count: z.number().int().nonnegative().optional(),
  guest_count: z.number().int().nonnegative().optional(),
  volunteer_hours_total: z.number().nonnegative().optional(),
  budget: z.number().nonnegative().optional(),
  expenses: z.number().nonnegative().optional(),
  sponsorship_amount: z.number().nonnegative().optional(),
  sdg_codes: z.array(z.string()).optional(),
  gps_lat: z.number().optional(),
  gps_lng: z.number().optional(),
  before_photos: z.array(z.string().url()).optional(),
  after_photos: z.array(z.string().url()).optional(),
  videos: z.array(z.string().url()).optional(),
  documents: z.array(z.string().url()).optional(),
  is_medical_camp: z.boolean().optional(),
  is_blood_donation: z.boolean().optional(),
  units_collected: z.number().int().nonnegative().optional(),
  impact_score: z.number().int().min(0).max(100).optional(),
  status: z.string().optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const { id } = await ctx.params;
  const { data, error } = await createAdminClient().from('activities').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ activity: data });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  const clean = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined));
  const { data, error } = await createAdminClient().from('activities').update(clean).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ activity: data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const { id } = await ctx.params;
  const { error } = await createAdminClient().from('activities').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
