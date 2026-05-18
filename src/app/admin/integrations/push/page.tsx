import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createAdminClient } from '@/lib/supabase/server';
import { loadVapidConfig } from '@/lib/push-config';
import { env } from '@/lib/env';
import { ArrowLeft, Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import { PushKeyCard } from './PushKeyCard';

export const dynamic = 'force-dynamic';

export default async function PushSetupPage() {
  await loadVapidConfig(true);
  const db = createAdminClient();
  const { data: row } = await db.from('push_settings')
    .select('id, public_key, private_key, subject, last_rotated_at, created_at, updated_at')
    .eq('id', 'singleton').maybeSingle();

  const pub = row?.public_key as string | null;
  const priv = row?.private_key as string | null;
  const exists = !!(pub && priv);
  const pubMasked = pub ? `${pub.slice(0, 10)}…${pub.slice(-10)}` : null;
  const privMasked = priv ? `${priv.slice(0, 10)}…${priv.slice(-10)}` : null;
  const envOverride = !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/admin/integrations" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-800">
        <ArrowLeft size={14} /> Back to Integrations
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1 flex items-center gap-2">
            <Bell className="text-amber-500" />
            Web Push — VAPID Keys
          </h1>
          <p className="text-gray-600">
            Auto-provisioned ECDSA P-256 keypair used to sign push notifications.
            Generated on first install and stored in the <code>push_settings</code> singleton.
            Env vars <code>VAPID_PUBLIC_KEY</code> / <code>VAPID_PRIVATE_KEY</code>, if set,
            take precedence.
          </p>
        </div>
        {exists
          ? <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider"><CheckCircle2 size={12} /> Active</span>
          : <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold uppercase tracking-wider"><AlertCircle size={12} /> Missing</span>
        }
      </div>

      <Card>
        <CardHeader><CardTitle>Active keypair</CardTitle></CardHeader>
        <CardContent>
          <PushKeyCard
            publicKey={pub}
            publicKeyMasked={pubMasked}
            privateKeyMasked={privMasked}
            subject={(row?.subject as string | null) ?? null}
            lastRotatedAt={row?.last_rotated_at as string | null ?? null}
            envOverride={envOverride}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Browser configuration</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <p>
            The mobile app at <code>/m</code> fetches the public key from
            <code> /api/push/subscribe</code> when a member toggles notifications on —
            no extra env var is required. The service worker at <code>/sw.js</code>
            handles the incoming push events.
          </p>
          <p>
            <strong>To override via environment variables</strong> (recommended for production):
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li><code>VAPID_PUBLIC_KEY</code> — paste the active public key shown above</li>
            <li><code>VAPID_PRIVATE_KEY</code> — paste the active private key</li>
            <li><code>VAPID_SUBJECT</code> — <code>mailto:</code> URL the push services contact on bounces</li>
            <li><code>NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> — only needed if you want it baked at build time</li>
          </ul>
          <p className="text-xs text-gray-500">
            When env vars are set they take precedence over the database, so you can
            rotate keys without touching the DB.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
