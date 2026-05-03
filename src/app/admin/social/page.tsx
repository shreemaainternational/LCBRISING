import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, integrations } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function SocialPage() {
  type Post = {
    id: string; platform: string; caption: string | null; status: string;
    scheduled_at: string | null; published_at: string | null;
    external_url: string | null; last_error: string | null; created_at: string;
  };
  let posts: Post[] = [];
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('social_posts').select('*').order('created_at', { ascending: false }).limit(100);
    posts = (data ?? []) as Post[];
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Social</h1>
      <p className="text-gray-600 mb-8">Posts published, queued and scheduled across platforms.</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <ConnStat name="Facebook"  ok={integrations.facebook} />
        <ConnStat name="Instagram" ok={integrations.instagram} />
        <ConnStat name="LinkedIn"  ok={integrations.linkedin} />
        <ConnStat name="WhatsApp"  ok={integrations.whatsappBusiness || integrations.twilio} />
        <ConnStat name="OpenAI"    ok={integrations.openai} />
      </div>

      <div className="mb-6">
        <Link href="/admin/creative" className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand-500 text-navy-900 font-semibold">
          ✨ New post in Creative Builder
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>{posts.length} posts</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Platform</th>
                <th className="text-left p-3">Caption</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">When</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-gray-500">No posts yet — create one in the Creative Builder.</td></tr>
              ) : posts.map((p) => (
                <tr key={p.id} className="border-t align-top">
                  <td className="p-3"><Badge variant="secondary">{p.platform}</Badge></td>
                  <td className="p-3 max-w-md">
                    <div className="line-clamp-2 text-gray-700">{p.caption ?? ''}</div>
                    {p.last_error && <div className="text-xs text-red-600 mt-1">{p.last_error}</div>}
                  </td>
                  <td className="p-3">
                    <Badge variant={
                      p.status === 'published' ? 'success'
                      : p.status === 'failed' ? 'danger'
                      : p.status === 'scheduled' ? 'warning'
                      : 'secondary'
                    }>
                      {p.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-gray-500 text-xs">
                    {p.published_at ?? p.scheduled_at ?? p.created_at}
                  </td>
                  <td className="p-3">
                    {p.external_url && (
                      <a href={p.external_url} target="_blank" rel="noreferrer"
                         className="text-brand-600 hover:underline">View</a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function ConnStat({ name, ok }: { name: string; ok: boolean }) {
  return (
    <div className={`p-3 rounded-md border text-sm ${ok ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
      <div className="font-medium">{name}</div>
      <div className={`text-xs ${ok ? 'text-green-700' : 'text-gray-500'}`}>
        {ok ? 'Connected' : 'Not configured'}
      </div>
    </div>
  );
}
