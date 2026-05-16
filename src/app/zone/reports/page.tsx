import Link from 'next/link';
import { requireZoneChair } from '@/lib/zone-portal';
import { ZoneTabs } from '../ZoneTabs';
import { createAdminClient } from '@/lib/supabase/server';
import { FileText, Presentation, Download } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ZoneReportsPage() {
  const ctx = await requireZoneChair();
  void ctx;
  const { data: reports } = await createAdminClient()
    .from('reports').select('id, title, type, format, period_start, period_end, size_bytes, created_at')
    .order('created_at', { ascending: false }).limit(30);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight">Reports</h2>
          <p className="text-gray-600 text-sm mt-1">Generated PDF / PPTX reports for this zone.</p>
        </div>
        <Link href="/admin/reports/new" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold">
          Generate new
        </Link>
      </div>
      <ZoneTabs />
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Title</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Period</th>
              <th className="text-left p-3">Format</th>
              <th className="text-right p-3"></th>
            </tr>
          </thead>
          <tbody>
            {!reports?.length ? (
              <tr><td colSpan={5} className="p-6 text-center text-gray-500 text-sm">No reports yet</td></tr>
            ) : reports.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-medium">{r.title}</td>
                <td className="p-3 text-gray-600 capitalize">{String(r.type).replace(/_/g, ' ')}</td>
                <td className="p-3 text-xs text-gray-600">{r.period_start} → {r.period_end}</td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100">
                    {r.format === 'pptx' ? <Presentation size={11} /> : <FileText size={11} />}
                    {r.format}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <a href={`/api/reports/${r.id}/download`} className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900">
                    <Download size={12} /> Download
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
