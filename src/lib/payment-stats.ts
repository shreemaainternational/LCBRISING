import { createAdminClient } from '@/lib/supabase/server';

export interface PaymentStats {
  totalCollected: number;
  pendingAmount: number;
  paidCount: number;
  pendingCount: number;
  expiredCount: number;
  pendingProofs: number;
  daily: { date: string; collected: number; count: number }[];
  topCustomers: { name: string; total: number; count: number }[];
}

export async function getPaymentStats(): Promise<PaymentStats> {
  const supabase = createAdminClient();

  const since = new Date(Date.now() - 30 * 86_400_000);
  const sinceIso = since.toISOString();

  const [{ data: invoices }, { data: proofs }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, status, amount, customer_name, created_at')
      .is('deleted_at', null)
      .gte('created_at', sinceIso),
    supabase
      .from('payment_proofs')
      .select('id, status')
      .eq('status', 'pending'),
  ]);

  let totalCollected = 0;
  let pendingAmount = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let expiredCount = 0;

  const dailyMap = new Map<string, { collected: number; count: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { collected: 0, count: 0 });
  }
  const customerMap = new Map<string, { total: number; count: number }>();

  for (const inv of invoices ?? []) {
    const amt = Number(inv.amount);
    const day = String(inv.created_at).slice(0, 10);
    if (inv.status === 'paid') {
      totalCollected += amt;
      paidCount += 1;
      const bucket = dailyMap.get(day);
      if (bucket) {
        bucket.collected += amt;
        bucket.count += 1;
      }
      const c = customerMap.get(inv.customer_name) ?? { total: 0, count: 0 };
      c.total += amt;
      c.count += 1;
      customerMap.set(inv.customer_name, c);
    } else if (inv.status === 'sent' || inv.status === 'partial') {
      pendingAmount += amt;
      pendingCount += 1;
    } else if (inv.status === 'expired') {
      expiredCount += 1;
    }
  }

  const daily = Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v }));
  const topCustomers = Array.from(customerMap.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return {
    totalCollected,
    pendingAmount,
    paidCount,
    pendingCount,
    expiredCount,
    pendingProofs: proofs?.length ?? 0,
    daily,
    topCustomers,
  };
}
