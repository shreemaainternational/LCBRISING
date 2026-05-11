import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: inv } = await supabase
    .from('invoices')
    .select('id, status, expires_at')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (!inv) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const { data: proofs } = await supabase
    .from('payment_proofs')
    .select('id, method, status, utr, created_at, reviewed_at, rejection_reason')
    .eq('invoice_id', id)
    .order('created_at', { ascending: false });

  return NextResponse.json({
    invoice_status: inv.status,
    expires_at: inv.expires_at,
    proofs: proofs ?? [],
  });
}
