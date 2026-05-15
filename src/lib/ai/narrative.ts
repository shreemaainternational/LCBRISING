/**
 * AI narrative writer for NGO reports.
 * Generates executive summaries, activity descriptions, beneficiary
 * impact stories and board-meeting summaries in English, Gujarati,
 * or both.
 *
 * No-op (returns null) when OPENAI_API_KEY is absent so callers can
 * degrade to the deterministic narrative built by report builders.
 */
import { env, integrations } from '@/lib/env';

export type NarrativeLanguage = 'en' | 'gu' | 'bilingual';

export type NarrativeTone =
  | 'executive'
  | 'board'
  | 'donor'
  | 'press_release'
  | 'social_media'
  | 'lions_district'
  | 'volunteer_thanks'
  | 'sponsor_pitch';

export interface NarrativeSection {
  heading: string;
  body: string;
}

export interface NarrativeInput {
  /** Report title for context, e.g. "Monthly Report — April 2026". */
  title: string;
  /** ISO label for the period, e.g. "April 2026". */
  periodLabel: string;
  /** Lions year, e.g. "2025-26". */
  lionsYear: string;
  /** Top-level numbers the model can reference. */
  totals: Record<string, number | string>;
  /** Notable projects to feature. */
  highlights?: { title: string; date?: string; beneficiaries?: number; description?: string }[];
  /** Optional comparator block for growth language. */
  comparison?: { metric: string; current: number; previous: number }[];
  /** Optional sponsor / CSR list. */
  sponsors?: string[];
  /** Optional SDG codes touched, e.g. ["SDG3", "SDG4"]. */
  sdgs?: string[];
  language: NarrativeLanguage;
  tone?: NarrativeTone;
  /** Words target per section (soft). Default 70-100. */
  targetWords?: number;
}

export interface NarrativeOutput {
  language: NarrativeLanguage;
  tone: NarrativeTone;
  sections: NarrativeSection[];
  social_caption?: string;
  executive_one_liner?: string;
  meta?: { model: string; promptVersion: string };
}

const PROMPT_VERSION = '2026.05';

const TONE_GUIDE: Record<NarrativeTone, string> = {
  executive:
    'Crisp executive briefing voice. Active verbs. Numbers up front. No fluff. No hashtags.',
  board:
    'Board-meeting summary voice. Governance-friendly. Reference KPIs and forward plans.',
  donor:
    'Warm donor-stewardship voice. Personal, grateful, impact-led. Avoid jargon.',
  press_release:
    'Press-release voice. Third person, factual, quote-ready. Include a single short pull-quote attributed to the Club President.',
  social_media:
    'Punchy social-media voice. Short sentences. Emoji-light. End with a call to action.',
  lions_district:
    "Lions International district-style. Reference Global Causes (Vision, Diabetes, Childhood Cancer, Hunger, Environment, Humanitarian) and We Serve.",
  volunteer_thanks:
    "Volunteer appreciation voice. Specific, grateful, names of contributions over individual names. Avoid sounding generic.",
  sponsor_pitch:
    'CSR sponsor pitch voice. Outcome-oriented, ROI-flavored. Map to SDGs.',
};

const LANG_INSTRUCTIONS: Record<NarrativeLanguage, string> = {
  en: 'Output in clear, professional English.',
  gu:
    'Output ENTIRELY in Gujarati script (ગુજરાતી લિપિ). Use natural Gujarati phrasing — do not transliterate English. Numerals stay Western Arabic (1, 2, 3).',
  bilingual:
    'For every section, write the English body first, then on a new line a Gujarati translation prefixed with "ગુજરાતી: ". Keep both versions semantically aligned. Numerals stay Western Arabic.',
};

const SECTION_HEADINGS_GU: Record<string, string> = {
  'Executive Summary': 'કાર્યવાહક સારાંશ',
  'Flagship Project': 'મુખ્ય પ્રોજેક્ટ',
  'Membership & Engagement': 'સભ્યો અને ભાગીદારી',
  'Outlook': 'આગળનો માર્ગ',
  'Financial Health': 'આર્થિક સ્થિતિ',
  'Donor Engagement': 'દાનદાતા સંબંધો',
  'CSR Partnership Impact': 'CSR ભાગીદારી અસર',
  'Activity Overview': 'પ્રવૃત્તિ સારાંશ',
  'Event Performance': 'કાર્યક્રમ પ્રદર્શન',
  'Lions Service Framework': 'લાયન્સ સેવા માળખું',
  'Health Impact': 'આરોગ્ય અસર',
  'Beneficiary Reach': 'લાભાર્થી પહોંચ',
  'Service Hours': 'સેવા કલાકો',
  'Membership Health': 'સભ્યતા આરોગ્ય',
  'Recognition': 'સન્માન',
  'Growth Outlook': 'વૃદ્ધિ દૃષ્ટિ',
  'District Snapshot': 'જિલ્લા સ્થિતિ',
  'Multiple District Roll-up': 'મલ્ટિપલ ડિસ્ટ્રિક્ટ સારાંશ',
  'Lions International Submission': 'લાયન્સ ઇન્ટરનેશનલ રિપોર્ટ',
  'Alignment with United Nations SDGs': 'UN SDGs સાથે સંરેખણ',
};

/** Public: translate a section heading to Gujarati (returns input if no map). */
export function gujaratiHeading(en: string): string {
  return SECTION_HEADINGS_GU[en] ?? en;
}

export async function generateNarrative(input: NarrativeInput): Promise<NarrativeOutput | null> {
  if (!integrations.openai) return null;

  const tone = input.tone ?? 'lions_district';
  const targetWords = input.targetWords ?? 90;
  const model = env.OPENAI_MODEL ?? 'gpt-4o-mini';

  const sys = `You are a senior NGO communications writer for Lions International clubs in India. ${TONE_GUIDE[tone]} ${LANG_INSTRUCTIONS[input.language]} Ground every claim in the data provided. Do not invent numbers. Output strict JSON.`;

  const dataBlock = [
    `Report: ${input.title}`,
    `Period: ${input.periodLabel} (Lions Year ${input.lionsYear})`,
    'Totals:',
    ...Object.entries(input.totals).map(([k, v]) => `  - ${k}: ${v}`),
    input.highlights?.length
      ? `Highlights:\n${input.highlights.map((h) => `  - ${h.title}${h.date ? ` (${h.date})` : ''}${h.beneficiaries ? ` — ${h.beneficiaries} beneficiaries` : ''}${h.description ? `. ${h.description}` : ''}`).join('\n')}`
      : '',
    input.comparison?.length
      ? `Period-over-period comparison:\n${input.comparison.map((c) => `  - ${c.metric}: ${c.current} (prev ${c.previous})`).join('\n')}`
      : '',
    input.sponsors?.length ? `CSR sponsors: ${input.sponsors.join(', ')}` : '',
    input.sdgs?.length ? `SDGs touched: ${input.sdgs.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  const sectionList = [
    'Executive Summary',
    'Flagship Project',
    'Service Impact',
    'Outlook',
  ];

  const user = `Write a narrative for this NGO report.

${dataBlock}

Produce JSON with this exact shape:
{
  "sections": [
    ${sectionList.map((h) => `{ "heading": "${h}", "body": "<${targetWords}±20 words>" }`).join(',\n    ')}
  ],
  "social_caption": "<≤220 chars social-media caption${input.language === 'gu' ? ', in Gujarati' : input.language === 'bilingual' ? ', bilingual EN/GU' : ', in English'}>",
  "executive_one_liner": "<one-sentence summary${input.language === 'gu' ? ', in Gujarati' : input.language === 'bilingual' ? ', bilingual EN/GU' : ', in English'}>"
}

Section bodies must be flowing prose, not bullet points. Reference specific numbers from Totals where natural. If the language is Gujarati or bilingual, also translate each heading to Gujarati (in addition to the English heading) inside the same body, OR leave headings English and write Gujarati body — your choice for readability.`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      temperature: 0.4,
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  const json = (await res.json()) as { choices: { message: { content: string } }[] };
  const parsed = JSON.parse(json.choices[0].message.content) as {
    sections: NarrativeSection[];
    social_caption?: string;
    executive_one_liner?: string;
  };
  return {
    language: input.language,
    tone,
    sections: parsed.sections ?? [],
    social_caption: parsed.social_caption,
    executive_one_liner: parsed.executive_one_liner,
    meta: { model, promptVersion: PROMPT_VERSION },
  };
}

/**
 * Convenience: short-form translation helper. Translates an English
 * narrative section to Gujarati without re-running the full pipeline.
 */
export async function translateToGujarati(text: string): Promise<string | null> {
  if (!integrations.openai) return null;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: env.OPENAI_MODEL ?? 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'Translate user text to fluent Gujarati script. Preserve numbers and proper nouns. Reply with translation only — no preface.' },
        { role: 'user', content: text },
      ],
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { choices: { message: { content: string } }[] };
  return json.choices[0]?.message?.content?.trim() ?? null;
}
