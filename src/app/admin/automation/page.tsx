import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cpu, ArrowRight } from 'lucide-react';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { AutomationToggles } from './AutomationToggles';
import { AUTOMATION_DEFAULTS, type AutomationSettings } from '@/lib/automation/settings-config';

export const dynamic = 'force-dynamic';

async function loadSettings(): Promise<{ settings: AutomationSettings; unavailable: boolean }> {
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from('automation_settings')
      .select('officer_digest_enabled, birthday_greetings_enabled, anniversary_greetings_enabled, dues_reminders_enabled, lions_auto_sync_enabled, lions_auto_dedupe_enabled, enterprise_automation_enabled, auto_heal_enabled, auto_alert_enabled')
      .eq('id', 'singleton')
      .maybeSingle();
    if (error) return { settings: AUTOMATION_DEFAULTS, unavailable: true };
    return { settings: { ...AUTOMATION_DEFAULTS, ...(data ?? {}) }, unavailable: false };
  } catch {
    return { settings: AUTOMATION_DEFAULTS, unavailable: true };
  }
}

export default async function AutomationPage() {
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from('automation_jobs').select('*').order('created_at', { ascending: false }).limit(100);
  const { settings, unavailable } = await loadSettings();

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Automation</h1>
      <p className="text-gray-600 mb-8">Scheduled jobs and triggers.</p>

      <Link
        href="/admin/automation/enterprise"
        className="mb-8 flex items-center justify-between gap-3 rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 p-4 transition-shadow hover:shadow-md"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
            <Cpu size={18} className="text-purple-600" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-purple-700">Enterprise AI Automation</div>
            <div className="text-base font-bold text-navy-800">One conductor — auto-fetch, self-heal, health score & AI digest</div>
            <div className="text-xs text-gray-600">Supervises the Lions Portal fetch, job queue and integration health as a single orchestrated pipeline.</div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-purple-700">Open <ArrowRight size={15} /></span>
      </Link>

      <Card className="mb-8">
        <CardHeader><CardTitle>Scheduled automations</CardTitle></CardHeader>
        <CardContent>
          <AutomationToggles initial={settings} unavailable={unavailable} />
        </CardContent>
      </Card>

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
