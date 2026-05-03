import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AutomationPage() {
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from('automation_jobs').select('*').order('created_at', { ascending: false }).limit(100);

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Automation</h1>
      <p className="text-gray-600 mb-8">Scheduled jobs and triggers.</p>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <FlowCard title="On member signup" steps={['CRM entry', 'Welcome email']} />
        <FlowCard title="On due date - 7" steps={['Reminder email', 'WhatsApp ping']} />
        <FlowCard title="On donation captured" steps={['PDF receipt', 'Email + thank-you']} />
      </div>

      <Card>
        <CardHeader><CardTitle>Recent jobs</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Attempts</th>
                <th className="text-left p-3">Run after</th>
                <th className="text-left p-3">Last error</th>
              </tr>
            </thead>
            <tbody>
              {(jobs ?? []).map((j) => (
                <tr key={j.id} className="border-t">
                  <td className="p-3 font-medium">{j.job_type}</td>
                  <td className="p-3">
                    <Badge variant={j.status === 'completed' ? 'success' : j.status === 'failed' ? 'danger' : 'warning'}>{j.status}</Badge>
                  </td>
                  <td className="p-3 text-right">{j.attempts}</td>
                  <td className="p-3 text-gray-500">{new Date(j.run_after).toLocaleString('en-IN')}</td>
                  <td className="p-3 text-red-600 text-xs max-w-xs truncate">{j.last_error ?? ''}</td>
                </tr>
              ))}
              {(!jobs || jobs.length === 0) && (
                <tr><td colSpan={5} className="p-6 text-center text-gray-500">No jobs yet</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function FlowCard({ title, steps }: { title: string; steps: string[] }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="font-semibold text-navy-800 mb-3">{title}</div>
        <ol className="text-sm text-gray-700 space-y-1 list-decimal pl-5">
          {steps.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </CardContent>
    </Card>
  );
}
