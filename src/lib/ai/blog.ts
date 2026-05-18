import { generateContent } from '@/lib/ai/openai';
import { integrations } from '@/lib/env';

export type BlogDraft = {
  headline: string;
  subheading: string;
  body: string;
  cta?: string;
  excerpt?: string;
  tags?: string[];
  seo_title?: string;
  seo_description?: string;
};

export type AiUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
};

/**
 * AI helpers used by the admin blog editor.
 *
 * Every function gracefully throws a typed `AiUnavailableError` when
 * OPENAI_API_KEY is missing so the UI can fall back to manual writing
 * without surfacing a generic 500.
 */
export class AiUnavailableError extends Error {
  constructor() {
    super('OpenAI is not configured (OPENAI_API_KEY missing)');
    this.name = 'AiUnavailableError';
  }
}

function assertOpenAi() {
  if (!integrations.openai) throw new AiUnavailableError();
}

export async function draftBlogPost(input: {
  title: string;
  description?: string;
  category?: string;
  language?: 'en' | 'gu' | 'hi';
  tone?: string;
}): Promise<{ draft: BlogDraft; usage: AiUsage }> {
  assertOpenAi();
  const { content, usage } = await generateContent({
    type: 'blog_article',
    title: input.title,
    description: input.description,
    language: input.language ?? 'en',
    tone: input.tone ?? 'inspirational',
    extra: { category: input.category },
  });
  return {
    draft: {
      headline: content.headline ?? input.title,
      subheading: content.subheading ?? '',
      body: content.body ?? content.raw ?? '',
      cta: content.cta,
    },
    usage,
  };
}

export async function generateSeo(input: {
  title: string;
  excerpt: string;
  body: string;
  language?: 'en' | 'gu' | 'hi';
}): Promise<{
  seo_title: string;
  seo_description: string;
  tags: string[];
  usage: AiUsage;
}> {
  assertOpenAi();
  const { content, usage } = await generateContent({
    type: 'seo_meta',
    title: input.title,
    description: input.excerpt,
    language: input.language ?? 'en',
    extra: { body_excerpt: input.body.slice(0, 1200) },
  });
  return {
    seo_title: (content as { seo_title?: string }).seo_title ?? input.title,
    seo_description:
      (content as { seo_description?: string }).seo_description ?? input.excerpt.slice(0, 160),
    tags: (content as { tags?: string[] }).tags ?? [],
    usage,
  };
}

export async function suggestTitles(input: {
  topic: string;
  language?: 'en' | 'gu' | 'hi';
}): Promise<{ titles: string[]; usage: AiUsage }> {
  assertOpenAi();
  const { content, usage } = await generateContent({
    type: 'title_brainstorm',
    title: input.topic,
    language: input.language ?? 'en',
  });
  return {
    titles: (content as { titles?: string[] }).titles ?? [],
    usage,
  };
}

export async function translateBlog(input: {
  title: string;
  body: string;
  language: 'gu' | 'hi';
}): Promise<{ title: string; body: string; usage: AiUsage }> {
  assertOpenAi();
  const { content, usage } = await generateContent({
    type: 'translate_blog',
    title: input.title,
    description: input.body.slice(0, 4000),
    language: input.language,
  });
  return {
    title: (content as { title?: string }).title ?? input.title,
    body: (content as { body?: string }).body ?? input.body,
    usage,
  };
}

/** Rough words-per-minute estimate used by the editor and detail page. */
export function estimateReadingTime(body: string): number {
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/** Naive slug generator — deterministic and safe for URLs. */
export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
