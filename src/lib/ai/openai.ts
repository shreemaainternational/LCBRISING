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

export interface GenerateResult {
  content: AiContent;
  usage: AiUsage;
  /** 'ai' when OpenAI generated it; 'template' when fallback ran (no key / API error). */
  source: 'ai' | 'template';
  /** Present only when source === 'template' and an API call was attempted. */
  ai_error?: string;
}

/**
 * Lightweight OpenAI Chat Completions client. Uses fetch — no SDK dep.
 * The model (default `gpt-4o-mini`) is overridable via OPENAI_MODEL.
 *
 * Never throws on "OPENAI_API_KEY missing" or upstream errors — falls
 * back to hand-written templates so the Generate Content button always
 * produces something usable, even on a fresh install. Callers can
 * inspect `source` to know whether the result is AI- or template-generated.
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
}): Promise<GenerateResult> {
  if (!integrations.openai) {
    return {
      content: fallbackContent(args),
      usage: { prompt_tokens: 0, completion_tokens: 0, cost_usd: 0 },
      source: 'template',
    };
  }

  const model = env.OPENAI_MODEL ?? 'gpt-4o-mini';
  const sys = systemPromptFor(args);
  const user = userPromptFor(args);

  try {
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
      const txt = await res.text().catch(() => '');
      return {
        content: fallbackContent(args),
        usage: { prompt_tokens: 0, completion_tokens: 0, cost_usd: 0 },
        source: 'template',
        ai_error: `OpenAI ${res.status}: ${txt.slice(0, 200)}`,
      };
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
      source: 'ai',
    };
  } catch (e) {
    return {
      content: fallbackContent(args),
      usage: { prompt_tokens: 0, completion_tokens: 0, cost_usd: 0 },
      source: 'template',
      ai_error: (e as Error).message,
    };
  }
}

// ----- prompts ------------------------------------------------------
function systemPromptFor(args: { type: string; language?: string; platform?: string; tone?: string }) {
  const lang = ({ en: 'English', gu: 'Gujarati', hi: 'Hindi' } as Record<string, string>)[args.language ?? 'en'];
  return [
    `You are a senior content writer for the Lions Club of Baroda Rising Star — a service NGO in Vadodara, India under Lions Clubs International District 3232 FI. Motto: "We Serve."`,
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

// ----- fallback templates (used when OpenAI is unavailable) ---------
function fallbackContent(args: { type: string; title: string; description?: string; location?: string }): AiContent {
  const t = args.title || 'Lions service activity';
  const d = args.description ?? '';
  const where = args.location ? ` in ${args.location}` : '';
  const TAGS = ['LionsClubs', 'BarodaRisingStar', 'District3232FI', 'WeServe', 'CommunityService'];

  switch (args.type) {
    case 'social_post':
      return {
        caption: `🦁 ${t}${where}. ${d ? `${d.slice(0, 180)} ` : ''}Proud to serve our community alongside fellow Lions. #WeServe`,
        hashtags: TAGS,
      };
    case 'article':
      return {
        headline: t,
        subheading: 'A snapshot from the Lions Club of Baroda Rising Star',
        body: `${t}${where} — a service initiative led by the Lions Club of Baroda Rising Star. ${d}\n\nOur club continues to live the Lions International motto "We Serve" through projects that touch every corner of our community.\n\nFor more service stories, visit barodarisingstar.com.`,
        quote: '“We Serve” — Lions Clubs International',
      };
    case 'press_release':
      return {
        headline: t,
        subheading: 'Lions Club of Baroda Rising Star · District 3232 FI',
        body: `FOR IMMEDIATE RELEASE\n\nVadodara, Gujarat — The Lions Club of Baroda Rising Star announces ${t}${where}. ${d}\n\nThis initiative furthers the club's commitment to service in District 3232 FI of Lions Clubs International.\n\nAbout: The Lions Club of Baroda Rising Star is a chartered member of Lions Clubs International — the largest service-club organisation in the world.`,
        quote: '“Service to the community is service to humanity.”',
        cta: 'For media enquiries, write to barodarisingstar@gmail.com.',
      };
    case 'flyer_text':
      return {
        headline: t.slice(0, 60),
        subheading: d.slice(0, 90) || 'A Lions service initiative',
        body: `Join the Lions Club of Baroda Rising Star${where}.`,
        cta: 'Join us · We Serve',
      };
    case 'invitation':
      return {
        headline: `You're invited: ${t}`,
        body: `Lions Club of Baroda Rising Star warmly invites you to ${t}${where}. ${d}`,
        cta: 'RSVP today',
      };
    case 'birthday':
      return {
        caption: 'Wishing {{name}} a joyful birthday filled with the warmth of fellowship and the spirit of service. 🎂🦁',
        hashtags: ['HappyBirthday', ...TAGS],
      };
    case 'video_script':
      return {
        scenes: [
          { text: t, duration_seconds: 3 },
          { text: 'Lions Club of Baroda Rising Star', duration_seconds: 3 },
          { text: d.slice(0, 60) || 'Serving our community', duration_seconds: 3 },
          { text: 'District 3232 FI', duration_seconds: 2 },
          { text: '#WeServe', duration_seconds: 2 },
        ],
        caption: `🦁 ${t} — Lions Club of Baroda Rising Star. #WeServe`,
      };
    case 'blog_article':
      return {
        headline: t,
        subheading: 'A service story from District 3232 FI',
        body: `## ${t}\n\n${d || `${t}${where} — led by the Lions Club of Baroda Rising Star.`}\n\n## Why this matters\n\nEvery service activity is a small step toward the Lions International vision: to be a global leader in community and humanitarian service.\n\n## Get involved\n\nVisit barodarisingstar.com to volunteer, donate, or join a meeting.`,
        cta: 'Join us · We Serve',
      };
    default:
      return {
        body: `${t}${where} — Lions Club of Baroda Rising Star · District 3232 FI · We Serve.`,
      };
  }
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
