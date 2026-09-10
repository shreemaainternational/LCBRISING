import { loadOpenAiConfig } from './openai-config';
import type { CircularEntryFields, EntryType } from './circular-extract';

export interface PresentationSlide {
  title: string;
  bullets: string[];
}

/**
 * Every downstream asset auto-generated from one circular entry — the
 * "after you create / upload, produce a short message, flyer, presentation,
 * minutes, WhatsApp and social post" step.
 */
export interface CircularAssets {
  short_message: string;              // portal / push notification body
  whatsapp_text: string;              // formatted for a WhatsApp broadcast
  social_caption: string;
  social_hashtags: string[];
  flyer: { headline: string; subheading: string; body: string; cta: string };
  presentation: { slides: PresentationSlide[] };
  minutes: string;                    // minutes template (meetings) / report (events)
}

export interface AssetResult {
  assets: CircularAssets;
  source: 'ai' | 'template';
  ai_error?: string;
}

const TYPE_LABEL: Record<EntryType, string> = {
  circular: 'district circular',
  event: 'event',
  programme: 'programme',
  cabinet_meeting: 'cabinet meeting',
  dg_visit: "District Governor's official visit",
  festival: 'festival celebration',
  felicitation: 'felicitation ceremony',
  other: 'district communication',
};

const SYSTEM_PROMPT =
  'You are the communications officer for a Lions Clubs International district in India. ' +
  'From a single structured record you produce a full set of ready-to-send assets. ' +
  'Be factual — never invent statistics, names, dates or venues beyond what is given. ' +
  'Return ONLY JSON with keys: ' +
  'short_message (<= 300 chars, plain, for a portal/push notification), ' +
  'whatsapp_text (<= 700 chars, warm, with a few tasteful emojis and line breaks, ready to broadcast), ' +
  'social_caption (<= 400 chars for Instagram/Facebook), ' +
  'social_hashtags (array of 6-10 hashtags without the # symbol), ' +
  'flyer (object: headline <= 8 words, subheading <= 14 words, body <= 40 words, cta <= 6 words), ' +
  'presentation (object with slides: an array of 4-6 objects each { title, bullets: 2-4 short strings }), ' +
  'minutes (a minutes/report template in plain text with clear headings for the record). ' +
  'For cabinet_meeting the minutes must be an agenda/minutes skeleton; for events/festivals it is a short activity report.';

/**
 * Generate the asset bundle for one entry. Never throws — falls back to
 * hand-written templates when OpenAI is unavailable, so the "Generate" button
 * always yields something usable.
 */
export async function generateCircularAssets(
  entry: CircularEntryFields & { scope?: string },
): Promise<AssetResult> {
  const cfg = await loadOpenAiConfig();
  if (!cfg) return { assets: fallbackAssets(entry), source: 'template' };

  try {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${cfg.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: cfg.model,
        response_format: { type: 'json_object' },
        temperature: 0.6,
        max_tokens: 1600,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt(entry) },
        ],
      }),
    });
    if (!res.ok) {
      return {
        assets: fallbackAssets(entry), source: 'template',
        ai_error: `OpenAI ${res.status}: ${(await res.text().catch(() => '')).slice(0, 160)}`,
      };
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return { assets: fallbackAssets(entry), source: 'template' };
    return { assets: coerceAssets(JSON.parse(content) as Record<string, unknown>, entry), source: 'ai' };
  } catch (e) {
    return { assets: fallbackAssets(entry), source: 'template', ai_error: (e as Error).message };
  }
}

function userPrompt(entry: CircularEntryFields & { scope?: string }): string {
  return [
    `Record type: ${TYPE_LABEL[entry.entry_type] ?? entry.entry_type}`,
    `Title: ${entry.title}`,
    entry.description ? `Details: ${entry.description}` : '',
    entry.category ? `Category: ${entry.category}` : '',
    `Priority: ${entry.priority}`,
    entry.event_date ? `Date: ${entry.event_date}` : '',
    entry.start_time ? `Time: ${entry.start_time}${entry.end_time ? ` to ${entry.end_time}` : ''}` : '',
    entry.venue ? `Venue: ${entry.venue}` : '',
    entry.chief_guest ? `Chief guest / dignitary: ${entry.chief_guest}` : '',
    entry.scope ? `Audience: ${entry.scope}` : '',
  ].filter(Boolean).join('\n');
}

// ----- coercion of the AI payload ------------------------------------
function s(v: unknown, fallback = ''): string {
  return v == null ? fallback : String(v).trim() || fallback;
}

function coerceAssets(raw: Record<string, unknown>, entry: CircularEntryFields): CircularAssets {
  const fb = fallbackAssets(entry);
  const flyerRaw = (raw.flyer ?? {}) as Record<string, unknown>;
  const presRaw = (raw.presentation ?? {}) as Record<string, unknown>;
  const slidesRaw = Array.isArray(presRaw.slides) ? presRaw.slides : [];
  const slides: PresentationSlide[] = slidesRaw
    .map((sl) => {
      const o = (sl ?? {}) as Record<string, unknown>;
      const bullets = Array.isArray(o.bullets) ? o.bullets.map((b) => s(b)).filter(Boolean) : [];
      return { title: s(o.title), bullets };
    })
    .filter((sl) => sl.title || sl.bullets.length);

  const tags = Array.isArray(raw.social_hashtags)
    ? raw.social_hashtags.map((t) => s(t).replace(/^#/, '')).filter(Boolean)
    : [];

  return {
    short_message: s(raw.short_message, fb.short_message),
    whatsapp_text: s(raw.whatsapp_text, fb.whatsapp_text),
    social_caption: s(raw.social_caption, fb.social_caption),
    social_hashtags: tags.length ? tags : fb.social_hashtags,
    flyer: {
      headline: s(flyerRaw.headline, fb.flyer.headline),
      subheading: s(flyerRaw.subheading, fb.flyer.subheading),
      body: s(flyerRaw.body, fb.flyer.body),
      cta: s(flyerRaw.cta, fb.flyer.cta),
    },
    presentation: { slides: slides.length ? slides : fb.presentation.slides },
    minutes: s(raw.minutes, fb.minutes),
  };
}

// ----- deterministic fallback templates ------------------------------
function fallbackAssets(entry: CircularEntryFields): CircularAssets {
  const label = TYPE_LABEL[entry.entry_type] ?? 'district communication';
  const when = [entry.event_date, entry.start_time].filter(Boolean).join(' · ');
  const at = entry.venue ? ` at ${entry.venue}` : '';
  const desc = entry.description?.trim() || `${entry.title} — a ${label} from the district.`;
  const line = `${entry.title}${when ? ` (${when})` : ''}${at}.`;

  const isMeeting = entry.entry_type === 'cabinet_meeting';
  const minutes = isMeeting
    ? [
        `MINUTES / AGENDA — ${entry.title}`,
        entry.event_date ? `Date: ${entry.event_date}` : 'Date: __________',
        entry.venue ? `Venue: ${entry.venue}` : 'Venue: __________',
        entry.chief_guest ? `Chairperson: ${entry.chief_guest}` : 'Chairperson: __________',
        '',
        '1. Call to order & opening prayer',
        '2. Confirmation of previous minutes',
        '3. Officer reports',
        '4. Agenda items for discussion',
        '5. Resolutions passed',
        '6. Action items & responsibilities',
        '7. Any other business',
        '8. Vote of thanks & adjournment',
      ].join('\n')
    : [
        `ACTIVITY REPORT — ${entry.title}`,
        entry.event_date ? `Date: ${entry.event_date}` : 'Date: __________',
        entry.venue ? `Venue: ${entry.venue}` : 'Venue: __________',
        '',
        `Summary: ${desc}`,
        '',
        'Participation: __________',
        'Beneficiaries / impact: __________',
        'Photographs attached: yes / no',
      ].join('\n');

  const TAGS = ['LionsClubs', 'WeServe', 'LionsIndia', 'CommunityService',
    entry.entry_type === 'festival' ? 'Celebration' : 'District'];

  return {
    short_message: `📢 ${line} ${desc}`.slice(0, 300),
    whatsapp_text: [
      `🦁 *${entry.title}*`,
      when ? `📅 ${when}` : '',
      entry.venue ? `📍 ${entry.venue}` : '',
      entry.chief_guest ? `🎖️ Chief guest: ${entry.chief_guest}` : '',
      '',
      desc,
      '',
      '_We Serve_ 🤝',
    ].filter(Boolean).join('\n').slice(0, 700),
    social_caption: `🦁 ${line} ${desc}`.slice(0, 400),
    social_hashtags: TAGS,
    flyer: {
      headline: entry.title.slice(0, 60),
      subheading: when || (entry.category ?? `A Lions ${label}`),
      body: desc.slice(0, 200),
      cta: 'Join us · We Serve',
    },
    presentation: {
      slides: [
        { title: entry.title, bullets: [label, when, entry.venue ?? ''].filter(Boolean) },
        { title: 'Overview', bullets: [desc.slice(0, 160)] },
        {
          title: 'Details',
          bullets: [
            entry.event_date ? `Date: ${entry.event_date}` : '',
            entry.start_time ? `Time: ${entry.start_time}` : '',
            entry.venue ? `Venue: ${entry.venue}` : '',
            entry.chief_guest ? `Chief guest: ${entry.chief_guest}` : '',
          ].filter(Boolean),
        },
        { title: 'We Serve', bullets: ['Lions Clubs International', 'Together in service'] },
      ],
    },
    minutes,
  };
}
