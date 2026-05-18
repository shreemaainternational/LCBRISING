import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { integrations } from '@/lib/env';
import {
  AiUnavailableError,
  draftBlogPost,
  generateSeo,
  suggestTitles,
  translateBlog,
} from '@/lib/ai/blog';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  action: z.enum(['draft', 'seo', 'titles', 'translate']),
  title: z.string().optional().default(''),
  excerpt: z.string().optional().default(''),
  body: z.string().optional().default(''),
  category: z.string().optional(),
  language: z.enum(['en', 'gu', 'hi']).default('en'),
  topic: z.string().optional(),
  targetLanguage: z.enum(['gu', 'hi']).optional(),
  postId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  let me;
  try {
    me = await requireAdmin();
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!integrations.openai) {
    return NextResponse.json(
      { error: 'AI is offline. Add OPENAI_API_KEY to enable AI helpers.' },
      { status: 503 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }
  const input = parsed.data;

  try {
    if (input.action === 'draft') {
      if (!input.title) return NextResponse.json({ error: 'title required' }, { status: 400 });
      const { draft, usage } = await draftBlogPost({
        title: input.title,
        description: input.excerpt,
        category: input.category,
        language: input.language,
      });
      await logUsage(me?.id, input.postId, 'blog_article', input.language, usage, draft);
      return NextResponse.json({ ...draft });
    }

    if (input.action === 'seo') {
      if (!input.title) return NextResponse.json({ error: 'title required' }, { status: 400 });
      const out = await generateSeo({
        title: input.title,
        excerpt: input.excerpt,
        body: input.body,
        language: input.language,
      });
      const { usage, ...payload } = out;
      await logUsage(me?.id, input.postId, 'seo', input.language, usage, payload);
      return NextResponse.json(payload);
    }

    if (input.action === 'titles') {
      const topic = input.topic || input.title || input.excerpt;
      if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 });
      const { titles, usage } = await suggestTitles({ topic, language: input.language });
      await logUsage(me?.id, input.postId, 'title', input.language, usage, { titles });
      return NextResponse.json({ titles });
    }

    if (input.action === 'translate') {
      if (!input.body) return NextResponse.json({ error: 'body required' }, { status: 400 });
      const lang = input.targetLanguage ?? 'gu';
      const { title, body, usage } = await translateBlog({
        title: input.title,
        body: input.body,
        language: lang,
      });
      await logUsage(me?.id, input.postId, 'translate', lang, usage, { title, body });
      return NextResponse.json({ title, body });
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (e) {
    if (e instanceof AiUnavailableError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'AI call failed' },
      { status: 500 },
    );
  }
}

async function logUsage(
  memberId: string | undefined,
  postId: string | undefined,
  kind: string,
  language: string,
  usage: { prompt_tokens: number; completion_tokens: number; cost_usd: number },
  output: unknown,
) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
    const admin = createAdminClient();
    await admin.from('ai_generations').insert({
      kind,
      language,
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      cost_usd: usage.cost_usd,
      output: output as object,
      member_id: memberId ?? null,
      blog_post_id: postId ?? null,
    });
  } catch {
    // Audit logging is best-effort.
  }
}
