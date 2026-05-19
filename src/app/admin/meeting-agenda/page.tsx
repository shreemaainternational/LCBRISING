import { CalendarDays, Sparkles } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { integrations } from '@/lib/env';
import { MeetingAgendaStudio } from './MeetingAgendaStudio';

export const dynamic = 'force-dynamic';

export default async function MeetingAgendaPage() {
  const member = await requireAdmin();
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold text-navy-800 mb-1 flex items-center gap-2">
          <CalendarDays className="text-blue-500" /> Meeting Agenda Studio
        </h1>
        <p className="text-gray-600 max-w-3xl">
          Generate a board-presentation-ready Lions Club or Lions Zone meeting agenda,
          modelled on Lions Clubs International governance norms. Output is Markdown
          — copy, print, or paste into email / WhatsApp / your MOM document.
        </p>
      </div>

      {!integrations.openai && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-3">
          <Sparkles size={18} className="text-amber-600 mt-0.5" aria-hidden />
          <div>
            <strong>AI writer is offline.</strong> Add an OpenAI key in{' '}
            <code className="bg-white/60 px-1 rounded">/admin/integrations</code> to
            unlock LLM-generated agendas. The deterministic template will still produce
            a complete, signable document in the meantime.
          </div>
        </div>
      )}

      <MeetingAgendaStudio actorName={member.name ?? 'Lion'} />
    </div>
  );
}
