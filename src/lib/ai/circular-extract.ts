import { loadOpenAiConfig } from './openai-config';

/**
 * The canonical district-circular "table" — every field the bulk-upload
 * spreadsheet, the manual composer and the auto-extractor share. Kept as
 * loose strings so an extractor / spreadsheet can populate whatever it
 * finds; the API layer validates and coerces on save.
 */
export interface CircularEntryFields {
  entry_type: EntryType;
  title: string;
  description: string | null;
  category: string | null;
  priority: 'info' | 'important' | 'urgent';
  event_date: string | null;   // YYYY-MM-DD
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  chief_guest: string | null;
}

export type EntryType =
  | 'circular' | 'event' | 'programme' | 'cabinet_meeting'
  | 'dg_visit' | 'festival' | 'felicitation' | 'other';

export const ENTRY_TYPES: EntryType[] = [
  'circular', 'event', 'programme', 'cabinet_meeting',
  'dg_visit', 'festival', 'felicitation', 'other',
];

export interface ExtractionResult {
  fields: CircularEntryFields;
  confidence: 'high' | 'medium' | 'low';
  /** 'ai' when a vision/text model segregated it, 'template' otherwise. */
  source: 'ai' | 'template';
  ai_error?: string;
}

const SYSTEM_PROMPT =
  'You segregate a district communication (a Lions Club circular, event flyer, ' +
  'programme notice, cabinet-meeting agenda, DG-visit intimation, festival or ' +
  'felicitation announcement) into a structured record. Return ONLY JSON with keys: ' +
  'entry_type (one of circular|event|programme|cabinet_meeting|dg_visit|festival|felicitation|other), ' +
  'title (short headline, <= 140 chars), description (2-4 sentences summarising the notice), ' +
  'category (a short tag such as "service week", "policy", "meeting", "celebration"), ' +
  'priority (info|important|urgent), event_date (ISO YYYY-MM-DD if a date is stated, else null), ' +
  'start_time (as printed, e.g. "6:30 PM", else null), end_time (else null), ' +
  'venue (else null), chief_guest (name/designation of the chief guest or dignitary, else null), ' +
  'confidence (high|medium|low). Use null for anything not present. Do not invent facts. ' +
  'Prefer Indian date formats (DD/MM/YYYY) when disambiguating.';

/**
 * Segregate an uploaded flyer / poster / PDF page / presentation slide (as
 * an image) OR pasted notice text into the circular table fields.
 *
 * Never throws: falls back to a best-effort scaffold (title from the
 * filename / first line) so the upload flow always yields an editable row.
 */
export async function extractCircularEntry(args: {
  imageBytes?: Uint8Array;
  mimeType?: string;
  text?: string;
  filename?: string;
}): Promise<ExtractionResult> {
  const cfg = await loadOpenAiConfig();
  const hasImage = !!(args.imageBytes && args.mimeType?.startsWith('image/'));
  const hasText = !!args.text && args.text.trim().length > 0;

  if (!cfg || (!hasImage && !hasText)) {
    return { fields: scaffold(args), confidence: 'low', source: 'template' };
  }

  const userContent: unknown = hasImage
    ? [
        { type: 'text', text: 'Segregate this district communication into the JSON record.' },
        {
          type: 'image_url',
          image_url: {
            url: `data:${args.mimeType};base64,${Buffer.from(args.imageBytes!).toString('base64')}`,
            detail: 'high',
          },
        },
      ]
    : `Segregate this district communication into the JSON record:\n\n${args.text!.slice(0, 12000)}`;

  try {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${cfg.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: cfg.model,
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 700,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
      }),
    });
    if (!res.ok) {
      return {
        fields: scaffold(args), confidence: 'low', source: 'template',
        ai_error: `OpenAI ${res.status}: ${(await res.text().catch(() => '')).slice(0, 160)}`,
      };
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return { fields: scaffold(args), confidence: 'low', source: 'template' };

    const raw = JSON.parse(content) as Record<string, unknown>;
    return {
      fields: normalizeFields(raw, args),
      confidence: pickConfidence(raw.confidence),
      source: 'ai',
    };
  } catch (e) {
    return {
      fields: scaffold(args), confidence: 'low', source: 'template',
      ai_error: (e as Error).message,
    };
  }
}

// ----- normalisation --------------------------------------------------
function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s && s.toLowerCase() !== 'null' ? s : null;
}

function normalizeFields(raw: Record<string, unknown>, args: { filename?: string }): CircularEntryFields {
  const type = String(raw.entry_type ?? '').toLowerCase().replace(/[^a-z_]/g, '') as EntryType;
  const priority = String(raw.priority ?? '').toLowerCase();
  return {
    entry_type: ENTRY_TYPES.includes(type) ? type : 'circular',
    title: str(raw.title) ?? scaffoldTitle(args.filename),
    description: str(raw.description),
    category: str(raw.category),
    priority: priority === 'urgent' || priority === 'important' ? priority : 'info',
    event_date: normDate(raw.event_date),
    start_time: str(raw.start_time),
    end_time: str(raw.end_time),
    venue: str(raw.venue),
    chief_guest: str(raw.chief_guest),
  };
}

/** Accept ISO or DD/MM/YYYY (India-first) → YYYY-MM-DD, else null. */
function normDate(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const yyyy = y.length === 2 ? `20${y}` : y;
    return `${yyyy}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function pickConfidence(v: unknown): 'high' | 'medium' | 'low' {
  const s = String(v ?? '').toLowerCase();
  return s === 'high' || s === 'medium' ? s : 'low';
}

function scaffoldTitle(filename?: string): string {
  if (!filename) return 'Untitled circular';
  return filename.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim() || 'Untitled circular';
}

/** Best-effort record with no AI: title from filename or first text line. */
function scaffold(args: { text?: string; filename?: string }): CircularEntryFields {
  const firstLine = args.text?.split(/\r?\n/).map((l) => l.trim()).find(Boolean);
  return {
    entry_type: 'circular',
    title: (firstLine && firstLine.slice(0, 140)) || scaffoldTitle(args.filename),
    description: args.text ? args.text.trim().slice(0, 1000) : null,
    category: null,
    priority: 'info',
    event_date: null,
    start_time: null,
    end_time: null,
    venue: null,
    chief_guest: null,
  };
}
