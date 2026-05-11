import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: proof } = await supabase
    .from('payment_proofs')
    .select('screenshot_url')
    .eq('id', id)
    .maybeSingle();
  if (!proof?.screenshot_url) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const { data: signed, error } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(proof.screenshot_url, 60);
  if (error || !signed) return NextResponse.json({ error: 'signing failed' }, { status: 500 });

  return NextResponse.redirect(signed.signedUrl, 302);
}
