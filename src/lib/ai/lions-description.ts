/**
 * "Humanized Lions Description" — turns a validated service activity's raw
 * fields into the flowing prose Lions Portal report descriptions expect.
 * Reuses the OpenAI wiring from src/lib/ai/narrative.ts but is a narrower,
 * single-paragraph, no-invented-numbers writer for one activity at a time.
 *
 * No-op (returns null) when OPENAI_API_KEY is absent — callers fall back to
 * the deterministic template below so the "Ready for Lions Portal" step
 * never blocks on the AI integration being configured.
 */
import { env, integrations } from '@/lib/env';
import { activityCategoryLabel } from '@/lib/activity-categories';

export interface LionsDescriptionInput {
  title: string;
  category: string | null;
  date: string;
  location: string | null;
  description: string | null;
  beneficiaries: number;
  lionMembers: number;
  serviceHours: number;
  expenses: number;
  amountRaised: number;
  clubName?: string | null;
}

/** Deterministic fallback — always available, used when OpenAI isn't configured. */
export function deterministicLionsDescription(a: LionsDescriptionInput): string {
  const cause = activityCategoryLabel(a.category);
  const club = a.clubName ? `${a.clubName} ` : '';
  const parts = [
    `${club}Lions members carried out "${a.title}" on ${a.date}${a.location ? ` at ${a.location}` : ''}, `
      + `a ${cause} service activity serving ${a.beneficiaries} ${a.beneficiaries === 1 ? 'beneficiary' : 'beneficiaries'} `
      + `with ${a.lionMembers} Lion ${a.lionMembers === 1 ? 'member' : 'members'} contributing ${a.serviceHours} hours of service.`,
  ];
  if (a.description) parts.push(a.description.trim());
  if (a.amountRaised > 0) parts.push(`The project raised ₹${a.amountRaised.toLocaleString('en-IN')} in funds.`);
  if (a.expenses > 0) parts.push(`Total expenses for the activity were ₹${a.expenses.toLocaleString('en-IN')}.`);
  return parts.join(' ');
}

/** AI-humanized single-paragraph description in Lions Portal report style. */
export async function generateHumanizedLionsDescription(a: LionsDescriptionInput): Promise<string | null> {
  if (!integrations.openai) return null;
  const model = env.OPENAI_MODEL ?? 'gpt-4o-mini';
  const cause = activityCategoryLabel(a.category);

  const dataBlock = [
    `Title: ${a.title}`,
    `Cause: ${cause}`,
    `Date: ${a.date}`,
    a.location ? `Location: ${a.location}` : '',
    `Beneficiaries served: ${a.beneficiaries}`,
    `Lion members participating: ${a.lionMembers}`,
    `Total volunteer hours: ${a.serviceHours}`,
    `Expenses: ₹${a.expenses}`,
    a.amountRaised > 0 ? `Funds raised: ₹${a.amountRaised}` : '',
    a.description ? `Club's raw notes: ${a.description}` : '',
  ].filter(Boolean).join('\n');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content:
            'You write the "Description" field of a Lions Clubs International service activity report. '
            + 'One flowing paragraph, 60-120 words, third person, factual. Ground every claim in the data '
            + "given — never invent numbers, names or outcomes not present in the input. No hashtags, no bullet points.",
        },
        { role: 'user', content: `Write the report description for this activity:\n\n${dataBlock}` },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  const json = (await res.json()) as { choices: { message: { content: string } }[] };
  return json.choices[0]?.message?.content?.trim() || null;
}
