import { env, integrations } from '@/lib/env';

export type ClubInsightsInput = {
  club_id: string;
  club_name: string;
  member_total: number;
  active: number;
  lapsed: number;
  pending: number;
  attendance_last_30d: number;
  recent_events?: { title: string; date: string }[];
};

export type ClubInsightsOutput = {
  summary: string;
  strengths: string[];
  risks: string[];
  recommendations: string[];
  follow_up_actions: { priority: 'high' | 'medium' | 'low'; action: string }[];
};

/**
 * Generate a structured "executive briefing" for a club from its CRM
 * snapshot. Returns null when OPENAI_API_KEY is not configured so
 * callers can degrade gracefully.
 */
export async function generateClubInsights(
  input: ClubInsightsInput,
): Promise<ClubInsightsOutput | null> {
  if (!integrations.openai) return null;

  const model = env.OPENAI_MODEL ?? 'gpt-4o-mini';
  const sys = `You are an analyst for a Lions International district. Output strict JSON matching the requested shape. Be concise, actionable, and grounded only in the data provided. Avoid generic advice.`;
  const user = `Club: ${input.club_name}
Members: total=${input.member_total} active=${input.active} lapsed=${input.lapsed} pending=${input.pending}
Attendance (last 30 days): ${input.attendance_last_30d} check-ins
Recent events: ${(input.recent_events ?? []).map((e) => `${e.title} (${e.date})`).join('; ') || 'none'}

Return JSON with:
  summary: 1-2 sentence narrative
  strengths: 2-4 bullet items
  risks: 2-4 bullet items
  recommendations: 2-4 bullet items
  follow_up_actions: array of { priority: 'high'|'medium'|'low', action: string }`;

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
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  const json = (await res.json()) as { choices: { message: { content: string } }[] };
  try {
    return JSON.parse(json.choices[0].message.content) as ClubInsightsOutput;
  } catch {
    return null;
  }
}
