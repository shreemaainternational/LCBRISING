import { createAdminClient } from '@/lib/supabase/server';
import { TemplatesEditor, type Template } from './TemplatesEditor';

export const dynamic = 'force-dynamic';

async function loadTemplates(): Promise<{ templates: Template[]; unavailable: boolean }> {
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from('message_templates')
      .select('id, key, label, channel, subject, body')
      .order('label');
    if (error) return { templates: [], unavailable: true };
    return { templates: (data ?? []) as Template[], unavailable: false };
  } catch {
    return { templates: [], unavailable: true };
  }
}

export default async function TemplatesPage() {
  const { templates, unavailable } = await loadTemplates();

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Message Templates</h1>
      <p className="text-gray-600 mb-8">
        Reusable email &amp; WhatsApp copy your team can load into broadcasts — no code deploy needed.
      </p>

      {unavailable && (
        <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The <code className="bg-amber-100 px-1 rounded">message_templates</code> table isn&apos;t applied
          yet. Run migration <code className="bg-amber-100 px-1 rounded">0064_message_templates.sql</code>{' '}
          (Actions → &ldquo;Apply database migration&rdquo;) to enable saving.
        </div>
      )}

      <TemplatesEditor initial={templates} />
    </div>
  );
}
