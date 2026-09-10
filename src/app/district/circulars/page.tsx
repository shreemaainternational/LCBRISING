import Link from 'next/link';
import { requireDistrictGovernor } from '@/lib/district-portal';
import { DistrictTabs } from '../DistrictTabs';
import { createAdminClient } from '@/lib/supabase/server';
import { Megaphone, Pin, CheckCircle2, AlertTriangle, Table2 } from 'lucide-react';
import { CircularComposer } from './CircularComposer';

export const dynamic = 'force-dynamic';

interface CircularRow {
  id: string; reference_no: string | null; subject: string; body: string;
  priority: 'info' | 'important' | 'urgent'; category: string | null;
  channels: string[]; status: string;
  sent_at: string | null; scheduled_for: string | null;
  total_recipients: number; total_delivered: number; total_read: number; total_failed: number;
  pinned: boolean; created_at: string;
}

export default async function DistrictCircularsPage() {
  const ctx = await requireDistrictGovernor();
  const db = createAdminClient();
  const [{ data: circulars }, { data: zones }, { data: clubs }] = await Promise.all([
    db.from('district_circulars')
      .select('id, reference_no, subject, body, priority, category, channels, status, sent_at, scheduled_for, total_recipients, total_delivered, total_read, total_failed, pinned, created_at')
      .eq('district_id', ctx.district.id)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50),
    db.from('zones').select('id, code, name').eq('district_id', ctx.district.id).is('deleted_at', null).order('code'),
    db.from('clubs').select('id, name').eq('district_id', ctx.district.id).is('deleted_at', null).order('name'),
  ]);

  const rows = (circulars ?? []) as CircularRow[];
  const sent = rows.filter((r) => r.status === 'sent').length;
  const drafts = rows.filter((r) => r.status === 'draft' || r.status === 'queued').length;
  const failed = rows.filter((r) => r.status === 'failed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight inline-flex items-center gap-2">
            <Megaphone className="text-amber-500" size={28} />
            District Circulars
          </h2>
          <p className="text-gray-600 text-sm mt-1 max-w-3xl">
            Broadcast official communications to every club in District {ctx.district.code}.
            Choose channels (portal, email, push, WhatsApp), target zones or specific clubs,
            and track per-club delivery + read receipts.
          </p>
        </div>
        <Link href="/district/circulars/bulk"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-amber-300 bg-white text-amber-700 text-sm font-semibold shadow-sm hover:bg-amber-50 transition-colors">
          <Table2 size={16} /> Bulk upload &amp; auto-generate
        </Link>
      </div>
      <DistrictTabs />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Total" value={String(rows.length)} color="text-navy-900" />
        <KpiTile label="Sent" value={String(sent)} color="text-emerald-700" />
        <KpiTile label="Drafts / queued" value={String(drafts)} color="text-amber-700" />
        <KpiTile label="Failed" value={String(failed)} color={failed ? 'text-rose-700' : 'text-gray-500'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-3">
          {!rows.length ? (
            <div className="bg-white rounded-xl border shadow-sm p-10 text-center text-sm text-gray-500">
              No circulars yet. Compose one on the right.
            </div>
          ) : rows.map((c) => (
            <article key={c.id} className={`bg-white rounded-xl border shadow-sm p-4 ${c.pinned ? 'border-amber-400' : ''}`}>
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-navy-800">{c.subject}</h3>
                    {c.pinned && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        <Pin size={11} /> Pinned
                      </span>
                    )}
                    <PriorityPill p={c.priority} />
                    <StatusPill s={c.status} />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {c.reference_no ?? c.id.slice(0, 8)} ·
                    {' ' + (c.sent_at ? `Sent ${new Date(c.sent_at).toLocaleString('en-IN')}` : `Created ${new Date(c.created_at).toLocaleDateString('en-IN')}`)}
                    {c.category && <> · {c.category}</>}
                  </div>
                </div>
                <div className="text-right text-xs text-gray-600 shrink-0">
                  <div className="font-bold text-navy-800">{c.total_delivered} / {c.total_recipients}</div>
                  <div>delivered</div>
                  {c.total_read > 0 && <div className="text-emerald-700 inline-flex items-center gap-1"><CheckCircle2 size={11} /> {c.total_read} read</div>}
                  {c.total_failed > 0 && <div className="text-rose-700 inline-flex items-center gap-1"><AlertTriangle size={11} /> {c.total_failed} failed</div>}
                </div>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap mt-2">{c.body}</p>
              <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                {c.channels.map((ch) => (
                  <span key={ch} className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase tracking-wider font-bold">{ch}</span>
                ))}
              </div>
            </article>
          ))}
        </div>

        <aside>
          <CircularComposer
            zones={zones ?? []}
            clubs={clubs ?? []}
          />
        </aside>
      </div>
    </div>
  );
}

function KpiTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-3">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
    </div>
  );
}

function PriorityPill({ p }: { p: 'info' | 'important' | 'urgent' }) {
  const cls = p === 'urgent' ? 'bg-rose-100 text-rose-700'
    : p === 'important' ? 'bg-amber-100 text-amber-800'
    : 'bg-blue-100 text-blue-700';
  return <span className={`inline-flex items-center text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${cls}`}>{p}</span>;
}
function StatusPill({ s }: { s: string }) {
  const cls = s === 'sent' ? 'bg-emerald-100 text-emerald-700'
    : s === 'sending' ? 'bg-blue-100 text-blue-700'
    : s === 'failed' ? 'bg-rose-100 text-rose-700'
    : 'bg-gray-100 text-gray-600';
  return <span className={`inline-flex items-center text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${cls}`}>{s}</span>;
}
