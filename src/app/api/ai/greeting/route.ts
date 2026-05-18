import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentMember } from '@/lib/auth';
import { loadOpenAiConfig } from '@/lib/ai/openai-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Occasion = z.enum([
  'birthday', 'anniversary', 'award', 'festival', 'event', 'achievement', 'thank_you', 'condolence',
]);
const Tone = z.enum(['warm', 'formal', 'witty', 'heartfelt', 'celebratory']);
const Lang = z.enum(['en', 'gu', 'hi', 'en+gu']);

const schema = z.object({
  occasion: Occasion,
  recipient_name: z.string().min(1).max(120),
  tone: Tone.default('warm'),
  language: Lang.default('en'),
  context: z.string().max(400).optional(),
  sender_name: z.string().max(120).optional(),
  max_chars: z.number().int().min(80).max(800).default(280),
});

const OCCASION_BRIEF: Record<z.infer<typeof Occasion>, string> = {
  birthday:    'birthday wish — celebrate the year ahead, service spirit, joy',
  anniversary: 'wedding / club / charter anniversary — togetherness, journey, milestones',
  award:       'award or recognition — pride, well-deserved, leadership',
  festival:    'festival greeting — joy, light, prosperity, community',
  event:       'event invitation or thank-you — gathering, fellowship, service',
  achievement: 'personal or club achievement — accomplishment, dedication',
  thank_you:   'thank-you message — gratitude, appreciation, partnership',
  condolence:  'condolence — gentle, respectful, supportive (avoid emojis)',
};

const LANG_INSTRUCTION: Record<z.infer<typeof Lang>, string> = {
  en:      'Write in clear, warm English.',
  gu:      'Write in Gujarati script. Keep sentences short and natural.',
  hi:      'Write in Devanagari Hindi script. Keep sentences short and natural.',
  'en+gu': 'Write a short bilingual greeting — first the Gujarati line, then the English line.',
};

const TONE_INSTRUCTION: Record<z.infer<typeof Tone>, string> = {
  warm:        'warm, kind, sincere',
  formal:      'formal, dignified, professional',
  witty:       'witty, light, playful but respectful',
  heartfelt:   'heartfelt, deeply personal, moving',
  celebratory: 'celebratory, vibrant, energetic',
};

/**
 * POST /api/ai/greeting
 *
 * Generate a branded Lions Club greeting via OpenAI gpt-4o-mini.
 * Falls back to a hand-written template if OPENAI_API_KEY is unset.
 */
export async function POST(req: Request) {
  const me = await getCurrentMember();
  if (!me) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }

  const { occasion, recipient_name, tone, language, context, sender_name, max_chars } = parsed.data;

  // Template fallback when OpenAI isn't configured (env or DB)
  const cfg = await loadOpenAiConfig();
  if (!cfg) {
    return NextResponse.json({
      ok: true,
      source: 'template',
      text: fallbackTemplate({ occasion, recipient_name, sender_name }),
      hashtags: hashtags(occasion),
    });
  }

  const system = `You are the official greeting writer for the Lions Club of Baroda Rising Star, District 3232 F1, India. Write greetings that are ${TONE_INSTRUCTION[tone]}, no more than ${max_chars} characters, and never schmaltzy or robotic. Avoid generic phrases like "many happy returns" — make it specific to Lions: "We Serve", service spirit, fellowship, lion-hearted impact. ${LANG_INSTRUCTION[language]} Do not add a salutation or signature — those are added separately. Include 1-2 fitting emojis unless the occasion is "condolence".`;

  const user = JSON.stringify({
    occasion_brief: OCCASION_BRIEF[occasion],
    recipient_name,
    extra_context: context ?? null,
    sender: sender_name ?? me.name,
    language,
    max_chars,
  });

  try {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${cfg.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.8,
        max_tokens: 280,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system + ' Return JSON: {"text": "<the greeting>", "hashtags": ["<3-5 tags>"]}.' },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return NextResponse.json({
        ok: true,
        source: 'template',
        text: fallbackTemplate({ occasion, recipient_name, sender_name }),
        hashtags: hashtags(occasion),
        ai_error: errText.slice(0, 200),
      });
    }
    const j = await res.json();
    const content = j.choices?.[0]?.message?.content ?? '{}';
    const parsedAi = JSON.parse(content) as { text?: string; hashtags?: string[] };
    return NextResponse.json({
      ok: true,
      source: 'ai',
      text: (parsedAi.text ?? '').slice(0, max_chars),
      hashtags: (parsedAi.hashtags ?? hashtags(occasion)).slice(0, 8),
    });
  } catch (e) {
    return NextResponse.json({
      ok: true,
      source: 'template',
      text: fallbackTemplate({ occasion, recipient_name, sender_name }),
      hashtags: hashtags(occasion),
      ai_error: (e as Error).message,
    });
  }
}

function fallbackTemplate({ occasion, recipient_name, sender_name }: { occasion: string; recipient_name: string; sender_name?: string }): string {
  switch (occasion) {
    case 'birthday':
      return `Dear ${recipient_name},\n\nWishing you a joyful birthday filled with the warmth of fellowship and the spirit of service. May the year ahead bring countless smiles to your face — and through you, to many more. 🎂🦁\n\nWith love${sender_name ? `,\n${sender_name}` : ''}\nLions Club of Baroda Rising Star`;
    case 'anniversary':
      return `Dear ${recipient_name},\n\nCongratulations on this beautiful milestone! May your journey together continue to be a story of love, service, and shared purpose. 💛\n\nWith warmest wishes${sender_name ? ` from ${sender_name}` : ''},\nLions Club of Baroda Rising Star`;
    case 'award':
      return `Dear ${recipient_name},\n\nHeartiest congratulations on this well-earned recognition. Your dedication to service has lifted us all — thank you for showing what a Lion looks like in action. 🏆🦁\n\nProudly,${sender_name ? `\n${sender_name}` : ''}\nLions Club of Baroda Rising Star`;
    case 'festival':
      return `Dear ${recipient_name},\n\nWishing you and your family a festival filled with light, laughter, and the abundance of community. May service light every corner of your home. ✨\n\nLions Club of Baroda Rising Star${sender_name ? `\n— ${sender_name}` : ''}`;
    case 'condolence':
      return `Dear ${recipient_name},\n\nWith deep sympathy in your time of loss. The Lions family stands with you. Please reach out when we can be of any service to you and your loved ones.\n\nWith care,${sender_name ? `\n${sender_name}` : ''}\nLions Club of Baroda Rising Star`;
    default:
      return `Dear ${recipient_name},\n\nThinking of you with gratitude and the Lions spirit of service. 🦁\n\nWarmly${sender_name ? `,\n${sender_name}` : ''}\nLions Club of Baroda Rising Star`;
  }
}

function hashtags(occasion: string): string[] {
  const common = ['LionsClub', 'BarodaRisingStar', 'District3232F1', 'WeServe'];
  const occasional: Record<string, string[]> = {
    birthday:    ['HappyBirthday', 'LionsFamily'],
    anniversary: ['Anniversary', 'Together'],
    award:       ['Congratulations', 'Recognition', 'Leadership'],
    festival:    ['Festival', 'Celebration'],
    achievement: ['Achievement', 'Proud'],
  };
  return [...(occasional[occasion] ?? []), ...common];
}
