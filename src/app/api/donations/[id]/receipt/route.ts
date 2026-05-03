import { NextResponse } from 'next/server';
import { renderDonationReceipt } from '@/lib/pdf';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Public receipt download. The donation id acts as a capability:
 * it's a UUID that's only known to the donor (sent via the receipt
 * email after a successful payment).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: donation, error } = await supabase
    .from('donations')
    .select('*, payments(razorpay_payment_id, status)')
    .eq('id', id).single();
  if (error || !donation) return NextResponse.json({ error: 'not found' }, { status: 404 });

  type WithPayments = typeof donation & { payments: { razorpay_payment_id: string | null; status: string } | null };
  const d = donation as WithPayments;
  if (d.payments && d.payments.status !== 'captured' && d.payments.status !== 'authorized') {
    return NextResponse.json({ error: 'payment not captured' }, { status: 402 });
  }

  const pdf = await renderDonationReceipt({
    receiptNo: d.receipt_no ?? d.id,
    donorName: d.donor_name,
    donorEmail: d.donor_email,
    donorPan: d.donor_pan,
    amount: d.amount,
    campaign: d.campaign,
    date: d.created_at,
    paymentRef: d.payments?.razorpay_payment_id ?? null,
  });

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="receipt-${d.receipt_no}.pdf"`,
    },
  });
}
