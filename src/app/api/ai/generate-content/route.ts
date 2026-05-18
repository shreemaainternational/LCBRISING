import { NextResponse } from 'next/server';
import { aiGenerateSchema } from '@/lib/validation/schemas';
import { generateContent } from '@/lib/ai/openai';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/env';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof Response) return err;
    // Supabase-level failures during auth lookup (e.g. invalid service-role
    // key, transient PostgREST hiccup) shouldn't surface as a cryptic
    // "Invalid API key" from a totally unrelated feature button.
    return NextResponse.json({
      error: 'Authentication check failed: ' + (err instanceof Error ? err.message : String(err)) +
        '. Verify NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY all belong to the same Supabase project.',
    }, { status: 401 });
  }

  const limit = rateLimit(`ai:${clientIp(req)}`, 20, 60_000);
  if (!limit.ok) return NextResponse.json({ error: 'too many' }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = aiGenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', details: parsed.error.flatten() }, { status: 400 });
  }

  let auditWarning: string | null = null;

  try {
    const { content, usage, source, ai_error } = await generateContent(parsed.data);

    // Best-effort audit log — never fail the request when bookkeeping breaks.
    // Common cause: SUPABASE_SERVICE_ROLE_KEY missing/invalid, or RLS blocking
    // the insert. The user already has their generated content; we don't want
    // to lose it just because we couldn't log it.
    if (isSupabaseConfigured() && source === 'ai' && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createAdminClient();
        const { error: insErr } = await supabase.from('ai_generations').insert({
          prompt_type: parsed.data.type,
          model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
          language: parsed.data.language,
          input: parsed.data,
          output: content,
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          cost_usd: usage.cost_usd,
        });
        if (insErr) auditWarning = `audit_log_failed: ${insErr.message}`;
      } catch (e) {
        auditWarning = `audit_log_threw: ${(e as Error).message}`;
      }
    }

    return NextResponse.json({ content, usage, source, ai_error, audit_warning: auditWarning });
  } catch (err) {
    // Last-resort safety net — generateContent already returns gracefully,
    // so we should never reach here for AI failures. This catches anything
    // truly unexpected.
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'AI error' },
      { status: 500 },
    );
  }
}
