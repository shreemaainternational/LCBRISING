import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { proofSubmitSchema } from '@/lib/validation/schemas';
import { createAdminClient } from '@/lib/supabase/server';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { getInvoiceById, isExpired } from '@/lib/invoices';

export const runtime = 'nodejs';

const MAX_PROOF_BYTES = 5 * 1024 * 1024;

async function handleMultipart(req: Request) {
  const form = await req.formData();
  const invoiceId = String(form.get('invoice_id') ?? '');
  const utr = String(form.get('utr') ?? '').trim() || undefined;
  const upiVpa = String(form.get('upi_vpa') ?? '').trim() || undefined;
  const notes = String(form.get('notes') ?? '').trim() || undefined;
  const amountClaimedStr = String(form.get('amount_claimed') ?? '').trim();
  const amountClaimed = amountClaimedStr ? Number(amountClaimedStr) : undefined;
  const file = form.get('screenshot');

  if (!invoiceId) {
    return NextResponse.json({ error: 'invoice_id required' }, { status: 400 });
  }

  const inv = await getInvoiceById(invoiceId);
  if (!inv) return NextResponse.json({ error: 'invoice not found' }, { status: 404 });
  if (inv.status === 'paid') return NextResponse.json({ error: 'invoice already paid' }, { status: 409 });
  if (isExpired(inv)) return NextResponse.json({ error: 'invoice expired' }, { status: 410 });

  const supabase = createAdminClient();

  let screenshotUrl: string | null = null;
  let screenshotHash: string | null = null;
  let method: 'screenshot' | 'utr' = utr && !file ? 'utr' : 'screenshot';

  if (file && file instanceof File) {
    if (file.size === 0) {
      return NextResponse.json({ error: 'empty file' }, { status: 400 });
    }
    if (file.size > MAX_PROOF_BYTES) {
      return NextResponse.json({ error: 'file too large (max 5MB)' }, { status: 413 });
    }
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'unsupported file type' }, { status: 415 });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    screenshotHash = createHash('sha256').update(bytes).digest('hex');

    const { data: dup } = await supabase
      .from('payment_proofs')
      .select('id')
      .eq('screenshot_hash', screenshotHash)
      .maybeSingle();
    if (dup) {
      return NextResponse.json({ error: 'duplicate screenshot already submitted' }, { status: 409 });
    }

    const ext = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1] ?? 'png';
    const path = `${inv.id}/${Date.now()}-${screenshotHash.slice(0, 12)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('payment-proofs')
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (upErr) {
      return NextResponse.json({ error: `upload failed: ${upErr.message}` }, { status: 500 });
    }
    screenshotUrl = path;
    method = 'screenshot';
  } else if (!utr) {
    return NextResponse.json({ error: 'provide a screenshot or UTR' }, { status: 400 });
  }

  if (utr) {
    const { data: utrDup } = await supabase
      .from('payment_proofs')
      .select('id')
      .eq('utr', utr)
      .maybeSingle();
    if (utrDup) {
      return NextResponse.json({ error: 'this UTR has already been submitted' }, { status: 409 });
    }
  }

  const { data: proof, error } = await supabase
    .from('payment_proofs')
    .insert({
      invoice_id: inv.id,
      method,
      utr: utr ?? null,
      upi_vpa: upiVpa ?? null,
      amount_claimed: amountClaimed ?? null,
      screenshot_url: screenshotUrl,
      screenshot_hash: screenshotHash,
      notes: notes ?? null,
      submitted_ip: clientIp(req),
      status: 'pending',
    })
    .select('id')
    .single();
  if (error || !proof) {
    return NextResponse.json({ error: error?.message ?? 'insert failed' }, { status: 500 });
  }

  await supabase.from('payment_audit_logs').insert({
    invoice_id: inv.id,
    actor_kind: 'customer',
    action: 'proof_submitted',
    detail: { proof_id: proof.id, method, utr: utr ?? null },
    ip: clientIp(req),
    user_agent: req.headers.get('user-agent') ?? null,
  });

  return NextResponse.json({ ok: true, proof_id: proof.id, status: 'pending' });
}

async function handleJson(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = proofSubmitSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const inv = await getInvoiceById(data.invoice_id);
  if (!inv) return NextResponse.json({ error: 'invoice not found' }, { status: 404 });
  if (inv.status === 'paid') return NextResponse.json({ error: 'invoice already paid' }, { status: 409 });
  if (isExpired(inv)) return NextResponse.json({ error: 'invoice expired' }, { status: 410 });

  const supabase = createAdminClient();

  if (data.utr) {
    const { data: utrDup } = await supabase
      .from('payment_proofs')
      .select('id')
      .eq('utr', data.utr)
      .maybeSingle();
    if (utrDup) {
      return NextResponse.json({ error: 'this UTR has already been submitted' }, { status: 409 });
    }
  }

  const { data: proof, error } = await supabase
    .from('payment_proofs')
    .insert({
      invoice_id: inv.id,
      method: data.method,
      utr: data.utr ?? null,
      upi_vpa: data.upi_vpa ?? null,
      amount_claimed: data.amount_claimed ?? null,
      screenshot_url: data.screenshot_url ?? null,
      screenshot_hash: data.screenshot_hash ?? null,
      notes: data.notes ?? null,
      submitted_ip: clientIp(req),
      status: 'pending',
    })
    .select('id')
    .single();
  if (error || !proof) {
    return NextResponse.json({ error: error?.message ?? 'insert failed' }, { status: 500 });
  }

  await supabase.from('payment_audit_logs').insert({
    invoice_id: inv.id,
    actor_kind: 'customer',
    action: 'proof_submitted',
    detail: { proof_id: proof.id, method: data.method },
    ip: clientIp(req),
    user_agent: req.headers.get('user-agent') ?? null,
  });

  return NextResponse.json({ ok: true, proof_id: proof.id, status: 'pending' });
}

export async function POST(req: Request) {
  const limit = rateLimit(`proof:${clientIp(req)}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'too many requests' }, { status: 429 });
  }

  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.startsWith('multipart/form-data')) {
    return handleMultipart(req);
  }
  return handleJson(req);
}
