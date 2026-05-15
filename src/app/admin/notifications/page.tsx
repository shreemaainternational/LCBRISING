import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createAdminClient } from '@/lib/supabase/server';
import { isPushConfigured } from '@/lib/push';
import { Bell, CheckCircle2, XCircle } from 'lucide-react';
import { PushBroadcastForm } from './PushBroadcastForm';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const configured = isPushConfigured();
  const db = createAdminClient();
  const [{ count: total }, { count: active }, { data: recent }] = await Promise.all([
    db.from('push_subscriptions').select('*', { count: 'exact', head: true }),
    db.from('push_subscriptions').select('*', { count: 'exact', head: true }).eq('is_active', true),
    db.from('push_subscriptions').select('id,endpoint,user_agent,member_id,last_used_at,is_active,created_at,members(name,email)').order('created_at', { ascending: false }).limit(30),
  ]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-navy-800 mb-1 flex items-center gap-2">
          <Bell className="text-amber-500" /> Push Notifications
        </h1>
        <p className="text-gray-600">
          Send web-push notifications to members who installed the mobile app and enabled
          notifications on their devices.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiTile label="Configured" value={configured ? 'Yes' : 'No'}
          icon={configured ? CheckCircle2 : XCircle} color={configured ? 'text-green-600' : 'text-gray-400'} />
        <KpiTile label="Active Devices" value={String(active ?? 0)} color="text-emerald-600" />
        <KpiTile label="Total Subscriptions" value={String(total ?? 0)} color="text-blue-600" />
      </div>

      {!configured && (
        <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <strong>VAPID keys not configured.</strong> Run <code className="bg-amber-100 px-1 rounded">npx web-push generate-vapid-keys</code> and
          set <code>VAPID_PUBLIC_KEY</code>, <code>VAPID_PRIVATE_KEY</code>,
          <code>NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> and <code>VAPID_SUBJECT</code> env vars.
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Send a Notification</CardTitle></CardHeader>
        <CardContent>
          <PushBroadcastForm disabled={!configured} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Registered Devices ({recent?.length ?? 0})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Member</th>
                <th className="text-left p-3">Device</th>
                <th className="text-left p-3">Last Used</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(recent ?? []).map((r) => {
                const m = r.members as { name?: string; email?: string } | null;
                return (
                  <tr key={r.id} className="border-t">
                    <td className="p-3">
                      <div className="font-medium">{m?.name ?? 'Unlinked'}</div>
                      {m?.email && <div className="text-xs text-gray-500">{m.email}</div>}
                    </td>
                    <td className="p-3 text-xs text-gray-600 truncate max-w-xs">{r.user_agent ?? '—'}</td>
                    <td className="p-3 text-xs text-gray-600">
                      {r.last_used_at ? new Date(r.last_used_at).toLocaleString('en-IN') : '—'}
                    </td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${r.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!recent?.length && (
                <tr><td colSpan={4} className="p-6 text-center text-gray-500 text-sm">No devices yet — install the mobile app and enable notifications.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiTile({ label, value, color, icon: Icon }: {
  label: string; value: string; color: string; icon?: React.ComponentType<{ size?: number }>;
}) {
  return (
    <div className="bg-white border rounded-lg p-4 flex items-center gap-3">
      {Icon && <Icon size={28} />}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
      </div>
    </div>
  );
}
