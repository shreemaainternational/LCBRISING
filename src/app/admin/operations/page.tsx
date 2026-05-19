import Link from 'next/link';
import {
  CRM_ACTIONS, CATEGORY_META, INTERNAL_INTEGRATIONS, actionsByCategory, type ActionCategory,
  type CrmAction, type AutomationMode,
} from '@/lib/crm-action-map';
import { getIntegrationRegistry } from '@/lib/integrations-registry';
import { loadOidcSettings } from '@/lib/oidc/runtime-config';
import { loadLionsApiSettings } from '@/lib/oidc/lions-api-runtime';
import { loadCronSecret } from '@/lib/cron-auth';
import { loadVapidConfig } from '@/lib/push-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OperationsSearch } from './OperationsSearch';
import {
  Workflow, Clock, Zap, Bot, Webhook, Layers, CommandIcon, ArrowRight,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const MODE_META: Record<AutomationMode, { label: string; icon: React.ComponentType<{ size?: number }>; cls: string }> = {
  manual:        { label: 'Manual',       icon: Workflow,  cls: 'bg-gray-100 text-gray-700' },
  cron:          { label: 'Scheduled',    icon: Clock,     cls: 'bg-amber-100 text-amber-800' },
  trigger:       { label: 'Auto-trigger', icon: Zap,       cls: 'bg-emerald-100 text-emerald-700' },
  'ai-assisted': { label: 'AI',           icon: Bot,       cls: 'bg-purple-100 text-purple-700' },
  webhook:       { label: 'Webhook',      icon: Webhook,   cls: 'bg-blue-100 text-blue-700' },
  bulk:          { label: 'Bulk',         icon: Layers,    cls: 'bg-rose-100 text-rose-700' },
};

interface Props { searchParams: Promise<{ q?: string; cat?: ActionCategory }>; }

export default async function OperationsPage({ searchParams }: Props) {
  await Promise.all([loadOidcSettings(true), loadLionsApiSettings(true), loadCronSecret(true), loadVapidConfig(true)]);
  const { q, cat } = await searchParams;

  const registry = getIntegrationRegistry();
  const configured = new Set(registry.filter((r) => r.configured).map((r) => r.key));

  const grouped = actionsByCategory();
  const cats = Object.entries(CATEGORY_META) as [ActionCategory, typeof CATEGORY_META[ActionCategory]][];

  const totalActions = CRM_ACTIONS.length;
  const availableActions = CRM_ACTIONS.filter((a) => isAvailable(a, configured)).length;
  const automated = CRM_ACTIONS.filter((a) => a.modes.some((m) => m === 'cron' || m === 'trigger' || m === 'webhook')).length;
  const aiActions = CRM_ACTIONS.filter((a) => a.modes.includes('ai-assisted')).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 inline-flex items-center gap-2">
            <CommandIcon className="text-amber-500" /> CRM Command Center
          </h1>
          <p className="text-gray-600 text-sm mt-1 max-w-3xl">
            Every operation, button, and automation in this CRM mapped to its destination.
            Each action shows where it lives, which integrations it touches, and whether
            it runs manually, on a schedule, on a trigger, via a webhook, or with AI assistance.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <KpiTile label="Total actions" value={totalActions} />
          <KpiTile label="Available" value={availableActions} color="text-emerald-700" />
          <KpiTile label="Automated" value={automated} color="text-amber-700" />
          <KpiTile label="AI-powered" value={aiActions} color="text-purple-700" />
        </div>
      </div>

      <OperationsSearch initial={q ?? ''} />

      {q ? (
        <ResultsGrid actions={filterActions(CRM_ACTIONS, q, cat)} configured={configured} />
      ) : (
        cats.map(([key, meta]) => {
          if (cat && cat !== key) return null;
          const list = grouped[key];
          if (!list.length) return null;
          const Icon = meta.icon;
          return (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2">
                    <span className={`w-9 h-9 rounded-full ${meta.color} flex items-center justify-center`}>
                      <Icon size={16} />
                    </span>
                    {meta.label}
                    <span className="text-xs text-gray-500 font-normal">({list.length})</span>
                  </span>
                  <Link href={`/admin/operations?cat=${key}`} className="text-xs text-amber-600 hover:underline">
                    Focus
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResultsGrid actions={list} configured={configured} compact />
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

function isAvailable(a: CrmAction, configured: Set<string>): boolean {
  if (!a.requires) return true;
  if (INTERNAL_INTEGRATIONS.has(a.requires)) return true;
  return configured.has(a.requires);
}

function filterActions(actions: CrmAction[], q: string, cat?: ActionCategory) {
  const needle = q.toLowerCase().trim();
  return actions.filter((a) => {
    if (cat && a.category !== cat) return false;
    if (!needle) return true;
    const hay = [a.label, a.description, a.category, ...(a.search ?? [])].join(' ').toLowerCase();
    return hay.includes(needle);
  });
}

function ResultsGrid({ actions, configured, compact }: { actions: CrmAction[]; configured: Set<string>; compact?: boolean }) {
  if (actions.length === 0) {
    return <p className="text-sm text-gray-500 py-6 text-center">No actions match.</p>;
  }
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 ${compact ? 'lg:grid-cols-3' : 'lg:grid-cols-3'} gap-3`}>
      {actions.map((a) => <ActionTile key={a.key} a={a} configured={configured} />)}
    </div>
  );
}

function ActionTile({ a, configured }: { a: CrmAction; configured: Set<string> }) {
  const Icon = a.icon;
  const requirementsMet = !a.requires || configured.has(a.requires);
  const missing = a.integrations.filter(
    (k) => !INTERNAL_INTEGRATIONS.has(k) && !configured.has(k),
  );

  return (
    <Link href={a.href}
      className={`relative block bg-white rounded-xl border shadow-sm p-3 hover:shadow-md hover:border-amber-300 transition-all ${requirementsMet ? '' : 'opacity-60'}`}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="inline-flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
            <Icon size={14} />
          </span>
          <div className="font-semibold text-navy-800 text-sm leading-tight">{a.label}</div>
        </div>
        <ArrowRight size={14} className="text-gray-400 shrink-0 mt-1.5" />
      </div>
      <p className="text-xs text-gray-600 leading-snug min-h-[2.5rem]">{a.description}</p>

      <div className="mt-2 flex items-center gap-1 flex-wrap">
        {a.modes.map((m) => {
          const meta = MODE_META[m];
          const ModeIcon = meta.icon;
          return (
            <span key={m} className={`inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full ${meta.cls}`}>
              <ModeIcon size={9} /> {meta.label}
            </span>
          );
        })}
      </div>

      {a.integrations.length > 0 && (
        <div className="mt-1.5 text-[10px] text-gray-500">
          uses: <span className="font-mono">{a.integrations.join(' · ')}</span>
        </div>
      )}

      {missing.length > 0 && (
        <div className="mt-1.5 text-[10px] text-rose-600">
          ⚠ missing: <span className="font-mono">{missing.join(', ')}</span>
        </div>
      )}

      <div className="absolute top-2 right-9 text-[9px] uppercase tracking-wider text-gray-400 font-mono">
        {a.href}
      </div>
    </Link>
  );
}

function KpiTile({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white rounded-lg border shadow-sm px-3 py-2">
      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`text-xl font-extrabold ${color ?? 'text-navy-900'}`}>{value}</div>
    </div>
  );
}
