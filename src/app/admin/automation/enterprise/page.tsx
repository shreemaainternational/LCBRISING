import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Cpu, Workflow, ShieldCheck, Bell } from 'lucide-react';
import { getConductorState, getConductorLog } from '@/lib/automation/orchestrator';
import { getAutomationSettings } from '@/lib/automation/settings';
import { ConductorPanel } from './ConductorPanel';

export const dynamic = 'force-dynamic';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  healthy: 'success',
  degraded: 'warning',
  critical: 'danger',
  failed: 'danger',
  skipped: 'default',
};

function fmt(dt: string | null): string {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN');
}

export default async function EnterpriseAutomationPage() {
  const [state, log, settings] = await Promise.all([
    getConductorState(),
    getConductorLog(20),
    getAutomationSettings(),
  ]);

  return (
    <div className="space-y-6 max-w-5xl">
      <Link href="/admin/automation" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-800">
        <ArrowLeft size={14} /> Back to Automation
      </Link>

      <div>
        <h1 className="mb-1 flex items-center gap-2 text-3xl font-bold text-navy-800">
          <Cpu className="text-purple-600" /> Enterprise AI Automation
        </h1>
        <p className="text-gray-600">
          One conductor supervises the whole platform — it fetches from the Lions Portal, updates the
          system, heals itself, drains the job queue, scores platform health and writes an AI ops digest,
          then alerts admins when something regresses. Runs on a schedule and on demand.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <PillarCard icon={Workflow} color="text-blue-600" title="Auto-fetch & update"
          body="Pulls districts, clubs & members from the Lions Portal and writes the changes into the CRM." />
        <PillarCard icon={ShieldCheck} color="text-emerald-600" title="Self-healing"
          body="Revives transiently-failed sync jobs and un-sticks automation jobs abandoned mid-run." />
        <PillarCard icon={Bell} color="text-purple-600" title="AI health & alerts"
          body="An AI ops digest scores health each run and pushes an alert to admins on any regression." />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu size={16} className="text-purple-600" /> Conductor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ConductorPanel
            enabled={settings.enterprise_automation_enabled}
            scheduleLabel="Deep · daily 00:00 · interim every 6h"
            initialState={state}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent conductor runs</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">Ran at</th>
                <th className="p-3 text-left">Trigger</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-right">Health</th>
                <th className="p-3 text-right">Duration</th>
                <th className="p-3 text-left">AI summary</th>
              </tr>
            </thead>
            <tbody>
              {log.map((r) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="p-3 text-gray-600 whitespace-nowrap">{fmt(r.ran_at)}</td>
                  <td className="p-3 capitalize text-gray-600">{r.trigger ?? '—'}</td>
                  <td className="p-3">
                    <Badge variant={STATUS_VARIANT[r.status ?? ''] ?? 'default'}>{r.status ?? '—'}</Badge>
                  </td>
                  <td className="p-3 text-right font-semibold text-navy-800">{r.health_score}</td>
                  <td className="p-3 text-right text-gray-500">{(r.duration_ms / 1000).toFixed(1)}s</td>
                  <td className="p-3 text-xs text-gray-600 max-w-md">{r.ai_summary ?? ''}</td>
                </tr>
              ))}
              {log.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-gray-500">No conductor runs yet — hit &ldquo;Run conductor now&rdquo;.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function PillarCard({ icon: Icon, color, title, body }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-1.5 flex items-center gap-2">
        <Icon size={16} className={color} />
        <span className="font-semibold text-navy-800">{title}</span>
      </div>
      <p className="text-xs text-gray-600">{body}</p>
    </div>
  );
}
