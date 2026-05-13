import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type AuditRow = {
  id: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  actor_member_id: string | null;
  actor_label: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

function actionTone(action: string): string {
  if (action.startsWith('rbac.denied')) return 'text-red-700 bg-red-50';
  if (action.endsWith('.failed') || action.includes('.delete')) return 'text-red-700 bg-red-50';
  if (action.endsWith('.create') || action.endsWith('.appoint')) return 'text-green-700 bg-green-50';
  if (action.startsWith('oauth.') || action.startsWith('sync.')) return 'text-blue-700 bg-blue-50';
  return 'text-gray-700 bg-gray-50';
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string; entity?: string }> }) {
  const params = await searchParams;
  const supa = await createClient();

  let q = supa
    .from('audit_logs')
    .select('id, action, entity, entity_id, actor_member_id, actor_label, payload, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (params.action) q = q.eq('action', params.action);
  if (params.entity) q = q.eq('entity', params.entity);
  const { data } = await q;
  const rows = (data ?? []) as AuditRow[];

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Audit log</h1>
      <p className="text-gray-600 mb-8">
        Every privileged action and RBAC denial. Filter by appending <code>?action=oauth.login</code> or <code>?entity=member</code> to the URL.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Last {rows.length} entries</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No audit entries yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">When</th>
                    <th className="text-left p-3">Action</th>
                    <th className="text-left p-3">Entity</th>
                    <th className="text-left p-3">Actor</th>
                    <th className="text-left p-3">Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t align-top">
                      <td className="p-3 text-gray-500 whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${actionTone(r.action)}`}>
                          {r.action}
                        </span>
                      </td>
                      <td className="p-3 text-xs">
                        {r.entity ?? '—'}
                        {r.entity_id && <div className="text-gray-400">{r.entity_id.slice(0, 8)}…</div>}
                      </td>
                      <td className="p-3 text-xs">
                        {r.actor_member_id ? r.actor_member_id.slice(0, 8) + '…' : (r.actor_label ?? '—')}
                      </td>
                      <td className="p-3 text-xs max-w-md">
                        {r.payload ? (
                          <code className="block bg-gray-50 p-1 rounded truncate">
                            {JSON.stringify(r.payload).slice(0, 120)}
                          </code>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
