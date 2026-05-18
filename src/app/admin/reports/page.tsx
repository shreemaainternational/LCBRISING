import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createAdminClient } from '@/lib/supabase/server';
import { REPORT_CATALOG } from '@/lib/reports';
import { FileText, Download, Plus, BarChart3, Trash2, Presentation } from 'lucide-react';

export const dynamic = 'force-dynamic';

const GROUP_ORDER: Array<'Period' | 'Activity' | 'People' | 'Finance' | 'Org' | 'Impact'> = [
  'Period', 'Activity', 'Finance', 'People', 'Org', 'Impact',
];

const GROUP_COLORS: Record<string, string> = {
  Period:   'bg-blue-50 border-blue-200 text-blue-700',
  Activity: 'bg-purple-50 border-purple-200 text-purple-700',
  Finance:  'bg-amber-50 border-amber-200 text-amber-700',
  People:   'bg-emerald-50 border-emerald-200 text-emerald-700',
  Org:      'bg-rose-50 border-rose-200 text-rose-700',
  Impact:   'bg-cyan-50 border-cyan-200 text-cyan-700',
};

export default async function ReportsPage() {
  const db = createAdminClient();
  const { data: recent } = await db.from('reports')
    .select('id,type,title,period_start,period_end,lions_year,format,status,size_bytes,created_at')
    .order('created_at', { ascending: false })
    .limit(40);

  const byGroup = new Map<string, typeof REPORT_CATALOG>();
  for (const g of GROUP_ORDER) byGroup.set(g, []);
  for (const e of REPORT_CATALOG) byGroup.get(e.group)?.push(e);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1 flex items-center gap-2">
            <BarChart3 className="text-amber-500" /> Reports & Analytics
          </h1>
          <p className="text-gray-600">
            Generate enterprise reports in PDF and PPTX with colorful charts. Monthly,
            quarterly, half-yearly, annual — plus 16 other report types.
          </p>
        </div>
        <Link
          href="/admin/reports/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-navy-900 text-white text-sm font-medium hover:bg-navy-800"
        >
          <Plus size={16} /> Generate New
        </Link>
      </div>

      <div className="space-y-6">
        {GROUP_ORDER.map((group) => {
          const entries = byGroup.get(group) ?? [];
          if (!entries.length) return null;
          return (
            <section key={group}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {group} Reports
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {entries.map((e) => (
                  <Link
                    key={e.type}
                    href={`/admin/reports/new?type=${e.type}`}
                    className={`block border rounded-lg p-4 hover:shadow-md transition-shadow ${GROUP_COLORS[group]}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-sm leading-tight">{e.title}</h3>
                      <FileText size={16} className="opacity-70 flex-shrink-0" />
                    </div>
                    <p className="text-xs opacity-80 leading-snug">{e.description}</p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Reports</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Period</th>
                <th className="text-left p-3">Format</th>
                <th className="text-right p-3">Size</th>
                <th className="text-left p-3">Created</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!recent?.length && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-500">
                    No reports yet. Generate your first report above.
                  </td>
                </tr>
              )}
              {(recent ?? []).map((r) => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium">
                    <Link href={`/admin/reports/${r.id}`} className="text-navy-800 hover:underline">
                      {r.title}
                    </Link>
                  </td>
                  <td className="p-3 text-gray-600">{prettyType(r.type)}</td>
                  <td className="p-3 text-gray-600">
                    {r.period_start} → {r.period_end}
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 uppercase">
                      {r.format === 'pptx' ? <Presentation size={11} /> : <FileText size={11} />}
                      {r.format}
                    </span>
                  </td>
                  <td className="p-3 text-right text-gray-600">{formatSize(r.size_bytes)}</td>
                  <td className="p-3 text-gray-600">{new Date(r.created_at).toLocaleString('en-IN')}</td>
                  <td className="p-3 text-right">
                    <a
                      href={`/api/reports/${r.id}/download`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900"
                    >
                      <Download size={14} /> Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function prettyType(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatSize(n: number | null): string {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
