import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { generateNarrative, translateToGujarati } from '@/lib/ai/narrative';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const schema = z.object({
  title: z.string(),
  periodLabel: z.string(),
  lionsYear: z.string().default(''),
  totals: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
  highlights: z.array(z.object({
    title: z.string(),
    date: z.string().optional(),
    beneficiaries: z.number().optional(),
    description: z.string().optional(),
  })).optional(),
  comparison: z.array(z.object({
    metric: z.string(),
    current: z.number(),
    previous: z.number(),
  })).optional(),
  sponsors: z.array(z.string()).optional(),
  sdgs: z.array(z.string()).optional(),
  language: z.enum(['en','gu','bilingual']).default('en'),
  tone: z.enum(['executive','board','donor','press_release','social_media','lions_district','volunteer_thanks','sponsor_pitch']).default('lions_district'),
  targetWords: z.number().int().min(40).max(300).optional(),
});

/** POST /api/ai/narrative — generate a narrative block. */
export async function POST(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });

  try {
    const out = await generateNarrative(parsed.data);
    if (!out) return NextResponse.json({ error: 'openai_not_configured' }, { status: 503 });
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: 'ai_failed', detail: String(e) }, { status: 502 });
  }
}

/** GET /api/ai/narrative/translate?text=... — quick GU translation. */
export async function GET(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  const url = new URL(req.url);
  const text = url.searchParams.get('text');
  if (!text) return NextResponse.json({ error: 'missing_text' }, { status: 400 });
  const translated = await translateToGujarati(text);
  if (translated == null) return NextResponse.json({ error: 'openai_not_configured' }, { status: 503 });
  return NextResponse.json({ original: text, gujarati: translated });
}
