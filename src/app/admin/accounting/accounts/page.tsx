import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function AccountsPage() {
  type Row = { id: string; code: string; name: string; type: string; subtype: string | null };
  let rows: Row[] = [];
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('accounts').select('id, code, name, type, subtype').eq('is_active', true).order('code');
    rows = (data ?? []) as Row[];
  }

  const groups = (['asset','liability','equity','income','expense'] as const).map((t) => ({
    type: t,
    accounts: rows.filter((r) => r.type === t),
  }));

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Chart of Accounts</h1>
      <p className="text-gray-600 mb-8">{rows.length} active accounts.</p>

      <div className="grid md:grid-cols-2 gap-4">
        {groups.map((g) => (
          <Card key={g.type}>
            <CardHeader>
              <CardTitle className="capitalize">{g.type}s ({g.accounts.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <tbody>
                  {g.accounts.map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="p-2 font-mono text-xs text-gray-500 w-16">{a.code}</td>
                      <td className="p-2">{a.name}</td>
                      <td className="p-2"><Badge variant="secondary">{a.subtype}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
