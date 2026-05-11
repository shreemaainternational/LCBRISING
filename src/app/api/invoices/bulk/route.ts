import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { buildInvoiceNo } from '@/lib/invoices';
import { parseCsv } from '@/lib/csv';
import { sendWhatsApp, whatsappTemplates } from '@/lib/whatsapp';
import { sendEmail } from '@/lib/email';
import { env, integrations } from '@/lib/env';

export const runtime = 'nodejs';

interface RowInput {
  customer_name: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  amount: number;
  description?: string | null;
  due_date?: string | null;
  expires_in_minutes?: number | null;
}

interface ParsedRow {
  row: number;
  ok: boolean;
  data?: RowInput;
  error?: string;
}

function coerceRows(input: unknown): ParsedRow[] {
  if (Array.isArray(input)) {
    return input.map((r, i) => coerceOne(r as Record<string, unknown>, i + 1));
  }
  if (typeof input === 'string') {
    return parseCsv(input).map((r, i) => coerceOne(r, i + 2));
  }
  return [];
}

function coerceOne(r: Record<string, unknown>, rowIdx: number): ParsedRow {
  const customer_name = String(r.customer_name ?? r.name ?? '').trim();
  if (!customer_name) return { row: rowIdx, ok: false, error: 'missing customer_name' };

  const amountRaw = r.amount ?? r.price ?? r.value;
  const amount = typeof amountRaw === 'number' ? amountRaw : Number(String(amountRaw ?? '').replace(/[, ₹]/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return { row: rowIdx, ok: false, error: 'invalid amount' };
  if (amount > 10_000_000) return { row: rowIdx, ok: false, error: 'amount too large' };

  return {
    row: rowIdx,
    ok: true,
    data: {
      customer_name,
      customer_phone: stringOrNull(r.customer_phone ?? r.phone ?? r.whatsapp),
      customer_email: stringOrNull(r.customer_email ?? r.email),
      amount,
      description: stringOrNull(r.description ?? r.note ?? r.notes),
      due_date: stringOrNull(r.due_date ?? r.due),
      expires_in_minutes: numberOrNull(r.expires_in_minutes),
    },
  };
}

function stringOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}
function numberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function POST(req: Request) {
  let member;
  try {
    member = await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  const contentType = req.headers.get('content-type') ?? '';
  let raw: unknown;
  let send: ('whatsapp' | 'email')[] = [];
  let dryRun = false;

  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => null) as {
      rows?: unknown;
      csv?: string;
      send?: string[];
      dry_run?: boolean;
    } | null;
    raw = body?.rows ?? body?.csv;
    send = (body?.send ?? []).filter((c): c is 'whatsapp' | 'email' => c === 'whatsapp' || c === 'email');
    dryRun = Boolean(body?.dry_run);
  } else if (contentType.startsWith('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('file');
    if (file instanceof File) {
      raw = await file.text();
    }
    send = String(form.get('send') ?? '').split(',').filter((c): c is 'whatsapp' | 'email' => c === 'whatsapp' || c === 'email');
    dryRun = String(form.get('dry_run') ?? '') === '1';
  } else {
    return NextResponse.json({ error: 'unsupported content type' }, { status: 415 });
  }

  const parsed = coerceRows(raw);
  if (parsed.length === 0) {
    return NextResponse.json({ error: 'no rows parsed' }, { status: 400 });
  }

  if (dryRun) {
    return NextResponse.json({ rows: parsed, total: parsed.length });
  }

  const supabase = createAdminClient();
  const created: { row: number; id: string; invoice_no: string; pay_url: string; sent: Record<string, boolean> }[] = [];
  const failed: { row: number; error: string }[] = [];

  for (const p of parsed) {
    if (!p.ok || !p.data) {
      failed.push({ row: p.row, error: p.error ?? 'invalid' });
      continue;
    }
    const d = p.data;
    const invoiceNo = buildInvoiceNo();
    const expiresAt = d.expires_in_minutes
      ? new Date(Date.now() + d.expires_in_minutes * 60_000).toISOString()
      : null;

    const { data: inv, error } = await supabase
      .from('invoices')
      .insert({
        invoice_no: invoiceNo,
        customer_name: d.customer_name,
        customer_email: d.customer_email ?? null,
        customer_phone: d.customer_phone ?? null,
        amount: d.amount,
        description: d.description ?? null,
        due_date: d.due_date ?? null,
        expires_at: expiresAt,
        status: 'sent',
      })
      .select('id, invoice_no')
      .single();

    if (error || !inv) {
      failed.push({ row: p.row, error: error?.message ?? 'insert failed' });
      continue;
    }

    const payUrl = `${env.NEXT_PUBLIC_SITE_URL}/pay/${inv.id}`;
    const sent: Record<string, boolean> = {};

    if (send.includes('whatsapp') && d.customer_phone && integrations.twilio) {
      try {
        await sendWhatsApp(
          d.customer_phone,
          whatsappTemplates.paymentRequest(d.customer_name, d.amount, inv.invoice_no, payUrl),
        );
        sent.whatsapp = true;
      } catch {
        sent.whatsapp = false;
      }
    }
    if (send.includes('email') && d.customer_email && integrations.resend) {
      try {
        await sendEmail({
          to: d.customer_email,
          subject: `Payment request: invoice ${inv.invoice_no} – ₹${d.amount}`,
          html: `<p>Dear ${d.customer_name},</p>
            <p>Please pay <strong>₹${d.amount}</strong> for invoice <strong>${inv.invoice_no}</strong>.</p>
            <p><a href="${payUrl}">Pay now</a></p>
            <p>Thank you,<br/>Lions Club of Baroda Rising Star</p>`,
        });
        sent.email = true;
      } catch {
        sent.email = false;
      }
    }

    await supabase.from('payment_audit_logs').insert({
      invoice_id: inv.id,
      actor_id: member.id,
      actor_kind: 'admin',
      action: 'invoice_bulk_created',
      detail: { batch_row: p.row, sent },
    });

    created.push({ row: p.row, id: inv.id, invoice_no: inv.invoice_no, pay_url: payUrl, sent });
  }

  return NextResponse.json({
    created_count: created.length,
    failed_count: failed.length,
    created,
    failed,
  });
}
