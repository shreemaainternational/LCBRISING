/**
 * Expense bill OCR — extracts structured data from a receipt /
 * invoice / tax bill photograph for the mobile activity logger.
 */
import { env, integrations } from '@/lib/env';

export interface BillItem {
  description: string;
  qty?: number | null;
  unit_price?: number | null;
  amount?: number | null;
}

export interface BillOcrResult {
  merchant_name: string | null;
  merchant_gstin: string | null;
  invoice_no: string | null;
  invoice_date: string | null;
  subtotal: number | null;
  tax: number | null;
  discount: number | null;
  total: number | null;
  currency: string | null;
  items: BillItem[];
  payment_mode: string | null;
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
}

export async function extractBill(
  imageBytes: Uint8Array,
  mimeType: string,
): Promise<BillOcrResult | null> {
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
      max_tokens: 900,
      messages: [
        {
          role: 'system',
          content:
            'You extract structured data from Indian expense bills, restaurant receipts, ' +
            'medical bills, supplier invoices, hardware shop bills, fuel receipts etc. ' +
            'Return ONLY JSON with keys: merchant_name (string), merchant_gstin (15-char ' +
            'GSTIN or null), invoice_no (string), invoice_date (ISO yyyy-mm-dd if ' +
            'visible), subtotal (number, INR), tax (number incl. all CGST+SGST+IGST), ' +
            'discount (number), total (number, INR — the final payable amount), ' +
            'currency ("INR" unless clearly otherwise), items (array of { description, ' +
            'qty, unit_price, amount }), payment_mode ("Cash"|"UPI"|"Card"|"Other"|null), ' +
            'confidence ("high"|"medium"|"low"), notes (any free-text remarks). ' +
            'Use null for fields you cannot read. Do not invent numbers. If only the ' +
            'total is visible, fill total and set subtotal/tax to null.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract the bill details from this photo.' },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { choices: { message: { content: string } }[] };
  try {
    const parsed = JSON.parse(json.choices[0].message.content) as Partial<BillOcrResult>;
    return {
      merchant_name: parsed.merchant_name ?? null,
      merchant_gstin: parsed.merchant_gstin ?? null,
      invoice_no: parsed.invoice_no ?? null,
      invoice_date: parsed.invoice_date ?? null,
      subtotal: numOrNull(parsed.subtotal),
      tax: numOrNull(parsed.tax),
      discount: numOrNull(parsed.discount),
      total: numOrNull(parsed.total),
      currency: parsed.currency ?? 'INR',
      items: Array.isArray(parsed.items) ? parsed.items : [],
      payment_mode: parsed.payment_mode ?? null,
      confidence: (parsed.confidence as BillOcrResult['confidence']) ?? 'low',
      notes: parsed.notes,
    };
  } catch {
    return null;
  }
}

function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
