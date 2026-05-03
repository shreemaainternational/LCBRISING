import { env, integrations } from '@/lib/env';

export interface AiContent {
  caption?: string;
  hashtags?: string[];
  body?: string;
  headline?: string;
  subheading?: string;
  quote?: string;
  cta?: string;
  scenes?: { text: string; duration_seconds?: number }[];
  raw?: string;
}

export interface AiUsage {
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
}

/**
 * Lightweight OpenAI Chat Completions client. Uses fetch — no SDK dep.
 * The model (default `gpt-4o-mini`) is overridable via OPENAI_MODEL.
 */
export async function generateContent(args: {
  type: string;
  title: string;
  description?: string;
  location?: string;
  language?: 'en' | 'gu' | 'hi';
  platform?: string;
  tone?: string;
  extra?: Record<string, unknown>;
}): Promise<{ content: AiContent; usage: AiUsage }> {
  if (!integrations.openai) {
    throw new Error('OpenAI is not configured (OPENAI_API_KEY missing)');
  }

  const model = env.OPENAI_MODEL ?? 'gpt-4o-mini';
  const sys = systemPromptFor(args);
  const user = userPromptFor(args);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: sys },
        { role: 'user',   content: user },
      ],
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI ${res.status}: ${txt.slice(0, 400)}`);
  }
  const json = await res.json() as {
    choices: { message: { content: string } }[];
    usage: { prompt_tokens: number; completion_tokens: number };
  };

  let content: AiContent;
  try {
    content = JSON.parse(json.choices[0].message.content) as AiContent;
  } catch {
    content = { raw: json.choices[0].message.content };
  }

  return {
    content,
    usage: {
      prompt_tokens: json.usage.prompt_tokens,
      completion_tokens: json.usage.completion_tokens,
      cost_usd: estimateCost(model, json.usage.prompt_tokens, json.usage.completion_tokens),
    },
  };
}

// ----- prompts ------------------------------------------------------
function systemPromptFor(args: { type: string; language?: string; platform?: string; tone?: string }) {
  const lang = ({ en: 'English', gu: 'Gujarati', hi: 'Hindi' } as Record<string, string>)[args.language ?? 'en'];
  return [
    `You are a senior content writer for the Lions Club of Baroda Rising Star — a service NGO in Vadodara, India under Lions Clubs International District 323-E. Motto: "We Serve."`,
    `Write in ${lang}. Tone: ${args.tone ?? 'inspirational'}. Always factual; never invent statistics.`,
    `Output VALID JSON only — no preface, no markdown fences. Schema depends on the requested type below.`,
  ].join(' ');
}

function userPromptFor(args: {
  type: string;
  title: string;
  description?: string;
  location?: string;
  platform?: string;
  extra?: Record<string, unknown>;
}) {
  const ctx = [
    `Title: ${args.title}`,
    args.description ? `Description: ${args.description}` : '',
    args.location ? `Location: ${args.location}` : '',
    args.platform ? `Target platform: ${args.platform}` : '',
    args.extra ? `Extra: ${JSON.stringify(args.extra)}` : '',
  ].filter(Boolean).join('\n');

  const schemas: Record<string, string> = {
    social_post:
      `Return: { "caption": string (<= 280 chars for twitter, <= 2200 for instagram, friendly intro), "hashtags": string[] (5-10, no #) }`,
    article:
      `Return: { "headline": string, "subheading": string, "body": string (3-5 short paragraphs), "quote": string }`,
    press_release:
      `Return: { "headline": string, "subheading": string, "body": string (with FOR IMMEDIATE RELEASE intro, 4 paragraphs, dateline, boilerplate), "quote": string, "cta": string }`,
    flyer_text:
      `Return: { "headline": string (<= 8 words), "subheading": string (<= 14 words), "body": string (<= 30 words), "cta": string (<= 6 words) }`,
    invitation:
      `Return: { "headline": string, "body": string (warm 2-3 sentences), "cta": string }`,
    birthday:
      `Return: { "caption": string (warm 1-2 sentences with name placeholder {{name}}), "hashtags": string[] }`,
    video_script:
      `Return: { "scenes": [ { "text": string (<= 12 words), "duration_seconds": number 2-4 } ] (5-7 scenes total), "caption": string }`,
    blog_article:
      `Return: { "headline": string, "subheading": string, "body": string (markdown, 600-900 words, with ## sections), "cta": string }`,
  };

  return [
    `Type: ${args.type}`,
    ctx,
    schemas[args.type] ?? `Return: { "body": string }`,
  ].join('\n\n');
}

// ----- pricing (USD per 1K tokens) — approx, update as needed ------
const PRICES: Record<string, { in: number; out: number }> = {
  'gpt-4o-mini':  { in: 0.00015,  out: 0.00060 },
  'gpt-4o':       { in: 0.00500,  out: 0.01500 },
  'gpt-4-turbo':  { in: 0.01000,  out: 0.03000 },
};

function estimateCost(model: string, pin: number, pout: number) {
  const p = PRICES[model] ?? PRICES['gpt-4o-mini'];
  return (pin / 1000) * p.in + (pout / 1000) * p.out;
}
