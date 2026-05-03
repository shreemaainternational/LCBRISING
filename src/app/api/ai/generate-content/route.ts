import { NextResponse } from 'next/server';
import { aiGenerateSchema } from '@/lib/validation/schemas';
import { generateContent } from '@/lib/ai/openai';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/env';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }

  const limit = rateLimit(`ai:${clientIp(req)}`, 20, 60_000);
  if (!limit.ok) return NextResponse.json({ error: 'too many' }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = aiGenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { content, usage } = await generateContent(parsed.data);

    if (isSupabaseConfigured()) {
      const supabase = createAdminClient();
      await supabase.from('ai_generations').insert({
        prompt_type: parsed.data.type,
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        language: parsed.data.language,
        input: parsed.data,
        output: content,
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        cost_usd: usage.cost_usd,
      });
    }

    return NextResponse.json({ content, usage });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'AI error' },
      { status: 500 },
    );
  }
}
