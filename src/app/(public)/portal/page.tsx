import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getPortalSession } from '@/lib/portal-session';
import { createAdminClient } from '@/lib/supabase/server';
import { phoneVariants } from '@/lib/phone';
import { formatINR, formatDate } from '@/lib/utils';
import { LogoutButton } from './LogoutButton';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'My invoices',
  robots: { index: false, follow: false },
};

export default async function PortalHomePage() {
  const session = await getPortalSession();
  if (!session) redirect('/portal/login');

  const supabase = createAdminClient();
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_no, amount, description, status, created_at, due_date')
    .in('customer_phone', phoneVariants(session.phone))
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100);

  const rows = invoices ?? [];
  const paid = rows.filter((r) => r.status === 'paid');
  const open = rows.filter((r) => r.status === 'sent' || r.status === 'partial');
  const totalPaid = paid.reduce((s, r) => s + Number(r.amount), 0);
  const totalDue = open.reduce((s, r) => s + Number(r.amount), 0);

  const masked = `+91 ${session.phone.slice(0, 5)} ${session.phone.slice(5)}`;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#1a0f3e] via-[#3b1a78] to-[#5b21b6] py-8 px-4 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=1920&q=80&auto=format&fit=crop')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="relative max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between text-white">
          <div>
            <h1 className="text-2xl font-bold">My invoices</h1>
            <p className="text-sm opacity-80">Signed in as {masked}</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/portal/preferences" className="text-white/80 hover:text-white underline">Preferences</Link>
            <LogoutButton />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Outstanding</div>
            <div className="text-2xl font-bold text-amber-700 mt-1">{formatINR(totalDue)}</div>
            <div className="text-xs text-gray-500 mt-1">{open.length} invoice(s)</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Paid lifetime</div>
            <div className="text-2xl font-bold text-green-700 mt-1">{formatINR(totalPaid)}</div>
            <div className="text-xs text-gray-500 mt-1">{paid.length} invoice(s)</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              You don&apos;t have any invoices on this number yet.
            </div>
          ) : (
            <ul>
              {rows.map((r) => (
                <li key={r.id} className="border-b last:border-0 p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate">
                      {r.description ?? `Invoice ${r.invoice_no}`}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">{r.invoice_no}</div>
                    <div className="text-xs text-gray-500">{formatDate(r.created_at)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{formatINR(Number(r.amount))}</div>
                    <StatusPill status={r.status} />
                  </div>
                  <div className="flex flex-col gap-1 items-end text-xs">
                    {r.status === 'paid' ? (
                      <Link href={`/api/invoices/${r.id}/pdf`} target="_blank" className="text-purple-700 hover:underline">Invoice</Link>
                    ) : (
                      <Link href={`/pay/${r.id}`} className="text-purple-700 hover:underline font-medium">Pay</Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    paid: 'bg-green-100 text-green-800',
    sent: 'bg-blue-100 text-blue-800',
    expired: 'bg-amber-100 text-amber-800',
    cancelled: 'bg-red-100 text-red-700',
    partial: 'bg-yellow-100 text-yellow-800',
    refunded: 'bg-orange-100 text-orange-800',
  };
  return (
    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium ${colors[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}
