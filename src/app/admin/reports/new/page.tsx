import { REPORT_CATALOG } from '@/lib/reports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GenerateReportForm } from './GenerateReportForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props { searchParams: Promise<{ type?: string }>; }

export default async function NewReportPage({ searchParams }: Props) {
  const { type } = await searchParams;
  const selected = REPORT_CATALOG.find((r) => r.type === type) ?? REPORT_CATALOG[0];

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/admin/reports" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-800">
        <ArrowLeft size={14} /> Back to Reports
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-navy-800 mb-1">Generate Report</h1>
        <p className="text-gray-600">
          Pick a report type, period and format. The system pulls from your live data
          (activities, donations, members, beneficiaries, CSR partners) and renders a
          fully-formatted PDF and/or PPTX with colorful charts.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Configuration</CardTitle></CardHeader>
        <CardContent>
          <GenerateReportForm catalog={REPORT_CATALOG} initialType={selected.type} />
        </CardContent>
      </Card>
    </div>
  );
}
