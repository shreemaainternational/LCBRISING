import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createAdminClient } from '@/lib/supabase/server';
import { ArrowLeft, Download, FileText, Presentation } from 'lucide-react';
import { formatINR } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface KPISummary { label: string; value: string | number; delta?: string; color?: string }

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: report } = await createAdminClient().from('reports').select('*').eq('id', id).single();
  if (!report) notFound();

  const kpis: KPISummary[] = (report.summary as { kpis?: KPISummary[] })?.kpis ?? [];
  const totals = (report.totals ?? {}) as Record<string, number | string>;

  return (
    <div className="space-y-6 max-w-6xl">
      <Link href="/admin/reports" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-800">
        <ArrowLeft size={14} /> Back to Reports
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 uppercase tracking-wider mb-2">
            {String(report.type).replace(/_/g, ' ')}
          </span>
          <h1 className="text-3xl font-bold text-navy-800 mb-1">{report.title}</h1>
          <p className="text-gray-600 text-sm">
            {report.period_start} → {report.period_end} · Lions Year {report.lions_year ?? '—'}
          </p>
        </div>
        <a
          href={`/api/reports/${report.id}/download`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-navy-900 text-white text-sm font-medium hover:bg-navy-800"
        >
          {report.format === 'pptx' ? <Presentation size={16} /> : <FileText size={16} />}
          <Download size={14} /> Download {String(report.format).toUpperCase()}
        </a>
      </div>

      {kpis.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Key Performance Indicators
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {kpis.map((k, i) => (
              <div key={i} className="relative bg-white border rounded-lg p-4 overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: k.color ?? '#1E40AF' }} />
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{k.label}</div>
                <div className="text-2xl font-bold text-navy-800">{k.value}</div>
                {k.delta && (
                  <div className={`text-xs font-medium mt-1 ${k.delta.startsWith('+') ? 'text-green-600' : k.delta.startsWith('-') ? 'text-red-600' : 'text-gray-500'}`}>
                    {k.delta}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Report Metadata</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <Row label="Status">{report.status}</Row>
          <Row label="Format">{String(report.format).toUpperCase()}</Row>
          <Row label="Size">{formatSize(report.size_bytes)}</Row>
          <Row label="Pages">{report.page_count ?? '—'}</Row>
          <Row label="Generated">{new Date(report.created_at).toLocaleString('en-IN')}</Row>
          <Row label="Filters">{JSON.stringify(report.filters ?? {}) || '{}'}</Row>
        </CardContent>
      </Card>

      {Object.keys(totals).length > 0 && (
        <Card>
          <CardHeader><CardTitle>Totals</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {Object.entries(totals).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-gray-500 uppercase text-xs font-semibold">{k.replace(/_/g,' ')}</dt>
                  <dd className="text-navy-800 font-semibold text-lg mt-0.5">
                    {typeof v === 'number' ? (k.includes('fund') || k.includes('csr') || k.includes('expense') || k.includes('donation') || k.includes('inflow') ? formatINR(v) : Math.round(v).toLocaleString('en-IN')) : String(v)}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b last:border-b-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium text-right break-all">{children}</span>
    </div>
  );
}

function formatSize(n: number | null): string {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
