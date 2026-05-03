import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function CommunicationsPage() {
  const supabase = await createClient();
  const { data: comms } = await supabase
    .from('communications').select('*').order('created_at', { ascending: false }).limit(200);

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Communications</h1>
      <p className="text-gray-600 mb-8">Last 200 messages sent through the platform.</p>
      <Card>
        <CardHeader><CardTitle>{comms?.length ?? 0} messages</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Channel</th>
                <th className="text-left p-3">Recipient</th>
                <th className="text-left p-3">Template</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">When</th>
              </tr>
            </thead>
            <tbody>
              {(comms ?? []).map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3"><Badge variant="secondary">{c.channel}</Badge></td>
                  <td className="p-3">{c.recipient}</td>
                  <td className="p-3">{c.template ?? '—'}</td>
                  <td className="p-3">{c.status}</td>
                  <td className="p-3 text-gray-500">{new Date(c.created_at).toLocaleString('en-IN')}</td>
                </tr>
              ))}
              {(!comms || comms.length === 0) && (
                <tr><td colSpan={5} className="p-6 text-center text-gray-500">No messages yet</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
