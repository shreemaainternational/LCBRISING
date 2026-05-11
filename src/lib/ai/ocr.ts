import { env, integrations } from '@/lib/env';

export interface ProofOcrResult {
  utr: string | null;
  amount: number | null;
  payer_vpa: string | null;
  payee_vpa: string | null;
  paid_at: string | null;
  app: string | null;
  confidence: 'high' | 'medium' | 'low';
  raw_text?: string;
}

/**
 * Extract UTR + amount + VPAs from a UPI / PhonePe / GPay / Paytm
 * payment success screenshot using OpenAI's vision model.
 *
 * Returns nulls (not throws) when fields aren't found, so callers can
 * decide to flag for manual review.
 */
export async function extractUpiProof(
  imageBytes: Uint8Array,
  mimeType: string,
): Promise<ProofOcrResult | null> {
  if (!integrations.openai) return null;
  if (!mimeType.startsWith('image/')) return null;

  const dataUrl = `data:${mimeType};base64,${Buffer.from(imageBytes).toString('base64')}`;
  const model = env.OPENAI_MODEL ?? 'gpt-4o-mini';

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 400,
      messages: [
        {
          role: 'system',
          content:
            'You extract structured data from Indian UPI payment success screenshots ' +
            '(PhonePe, GPay, Paytm, BHIM, Amazon Pay, bank apps). Return ONLY JSON with ' +
            'keys: utr (12-22 char alphanumeric reference / transaction id / RRN, no spaces), ' +
            'amount (number in INR rupees, no symbols), payer_vpa (sender UPI ID like name@bank), ' +
            'payee_vpa (recipient UPI ID), paid_at (ISO 8601 datetime if visible), ' +
            'app (PhonePe|GPay|Paytm|BHIM|Other), confidence (high|medium|low). ' +
            'Use null for missing fields. Do not guess. UTR is the long reference / transaction id, ' +
            'not the order number.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract the payment details from this screenshot.' },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) return null;
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const utrRaw = typeof parsed.utr === 'string' ? parsed.utr.trim() : null;
    const utr = utrRaw && /^[A-Za-z0-9]{8,40}$/.test(utrRaw) ? utrRaw : null;
    const amount = typeof parsed.amount === 'number' ? parsed.amount : null;
    return {
      utr,
      amount,
      payer_vpa: typeof parsed.payer_vpa === 'string' ? parsed.payer_vpa : null,
      payee_vpa: typeof parsed.payee_vpa === 'string' ? parsed.payee_vpa : null,
      paid_at: typeof parsed.paid_at === 'string' ? parsed.paid_at : null,
      app: typeof parsed.app === 'string' ? parsed.app : null,
      confidence: (parsed.confidence === 'high' || parsed.confidence === 'medium' || parsed.confidence === 'low')
        ? parsed.confidence
        : 'low',
    };
  } catch {
    return null;
  }
}
