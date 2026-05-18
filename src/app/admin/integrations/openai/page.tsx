import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createAdminClient } from '@/lib/supabase/server';
import { loadOpenAiConfig } from '@/lib/ai/openai-config';
import { env } from '@/lib/env';
import { ArrowLeft, Bot, CheckCircle2, AlertCircle } from 'lucide-react';
import { OpenAiSettingsForm } from './OpenAiSettingsForm';

export const dynamic = 'force-dynamic';

export default async function OpenAiSetupPage() {
  await loadOpenAiConfig(true);
  const db = createAdminClient();
  const { data: row } = await db.from('openai_settings')
    .select('id, api_key, model, base_url, is_active, monthly_cost_cap_usd, last_test_ok, last_test_at, last_test_error, configured_at, updated_at')
    .eq('id', 'singleton').maybeSingle();

  const hasKey = !!row?.api_key;
  const isActive = !!row?.is_active;
  const envOverride = !!env.OPENAI_API_KEY;
  const masked = hasKey ? `${(row!.api_key as string).slice(0, 7)}…${(row!.api_key as string).slice(-4)}` : null;

  const live = hasKey && isActive;

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/admin/integrations" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-800">
        <ArrowLeft size={14} /> Back to Integrations
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 inline-flex items-center gap-2">
            <Bot className="text-purple-500" />
            OpenAI — Content & Greeting AI
          </h1>
          <p className="text-gray-600 text-sm mt-1 max-w-2xl">
            Powers the AI Greeting Generator (<code>/m/greetings/new</code>), Creative Builder
            (<code>/admin/creative</code>), AI club commentary, member duplicate detector, and
            report narrative writer. Paste your key here — no Vercel env trip needed.
          </p>
        </div>
        {live
          ? <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider"><CheckCircle2 size={12} /> Active</span>
          : <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold uppercase tracking-wider"><AlertCircle size={12} /> Inactive</span>
        }
      </div>

      <Card>
        <CardHeader><CardTitle>API key & model</CardTitle></CardHeader>
        <CardContent>
          <OpenAiSettingsForm
            apiKeyMasked={masked}
            hasKey={hasKey}
            isActive={isActive}
            model={(row?.model as string | null) ?? 'gpt-4o-mini'}
            baseUrl={(row?.base_url as string | null) ?? 'https://api.openai.com/v1'}
            monthlyCostCap={(row?.monthly_cost_cap_usd as number | null) ?? null}
            lastTestOk={row?.last_test_ok as boolean | null ?? null}
            lastTestAt={row?.last_test_at as string | null ?? null}
            lastTestError={row?.last_test_error as string | null ?? null}
            envOverride={envOverride}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>What this powers</CardTitle></CardHeader>
        <CardContent>
          <ul className="text-sm text-gray-700 space-y-2">
            <li>✦ <strong>AI Greeting Generator</strong> — <code>/m/greetings/new</code> (multi-language, multi-tone branded greeting cards)</li>
            <li>✦ <strong>Creative Builder</strong> — <code>/admin/creative</code> (social posts, articles, press releases, video scripts)</li>
            <li>✦ <strong>Club Health Commentary</strong> — automatic plain-English summary per club</li>
            <li>✦ <strong>Member Duplicate Detector</strong> — <code>/admin/sync/duplicates</code> (confidence + reason per candidate pair)</li>
            <li>✦ <strong>Report Narrative Writer</strong> — monthly/quarterly/yearly PDF and PPTX report introductions</li>
            <li>✦ <strong>Daily Automation Engine</strong> — auto-drafts social posts after every activity log</li>
          </ul>
          <p className="text-xs text-gray-500 mt-4">
            Every feature degrades gracefully when no key is present — they fall back to
            hand-written templates so the UI never blocks. Adding a key just makes the first
            draft better.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
