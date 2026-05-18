import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import { FileText, Presentation, Download, BarChart3 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MobileReports() {
  const { data } = await createAdminClient()
    .from('reports')
    .select('id,type,title,period_start,period_end,format,size_bytes,created_at')
    .order('created_at', { ascending: false }).limit(30);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy-800">Reports</h1>
        <Link href="/admin/reports/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold">
          <BarChart3 size={16} /> Generate
        </Link>
      </div>

      <div className="space-y-2">
        {(data ?? []).map((r) => (
          <div key={r.id} className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                r.format === 'pptx' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
              }`}>
                {r.format === 'pptx' ? <Presentation size={18} /> : <FileText size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{r.title}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  {r.period_start} → {r.period_end} · {String(r.format).toUpperCase()}
                </div>
                <a
                  href={`/api/reports/${r.id}/download`}
                  className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 rounded-md bg-navy-900 text-white text-xs font-semibold"
                >
                  <Download size={12} /> Download
                </a>
              </div>
            </div>
          </div>
        ))}
        {!data?.length && (
          <div className="text-center text-sm text-gray-500 py-10 bg-white rounded-xl">
            No reports yet
          </div>
        )}
      </div>
    </div>
  );
}
