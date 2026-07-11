import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import { Cake, Gift, MessageCircle, ChevronRight, Sparkles, Calendar } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface MemberRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  birthday: string;
  club_id: string | null;
  clubs: { name?: string } | null;
}

function mmdd(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isToday(birthday: string): boolean {
  return birthday.slice(5, 10) === mmdd(new Date());
}
function isUpcoming(birthday: string, days = 30): boolean {
  const today = new Date();
  const bd = new Date(today.getFullYear(), Number(birthday.slice(5, 7)) - 1, Number(birthday.slice(8, 10)));
  if (bd < today) bd.setFullYear(today.getFullYear() + 1);
  const ms = bd.getTime() - today.getTime();
  return ms >= 0 && ms <= days * 86400_000;
}
function daysUntil(birthday: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const bd = new Date(today.getFullYear(), Number(birthday.slice(5, 7)) - 1, Number(birthday.slice(8, 10)));
  if (bd < today) bd.setFullYear(today.getFullYear() + 1);
  return Math.round((bd.getTime() - today.getTime()) / 86400_000);
}
function ageOn(birthday: string): number | null {
  const y = Number(birthday.slice(0, 4));
  if (!y || y < 1900) return null;
  return new Date().getFullYear() - y;
}

export default async function MobileGreetings() {
  const db = createAdminClient();
  const { data } = await db.from('members')
    .select('id, name, phone, email, birthday, club_id, clubs(name)')
    .is('deleted_at', null)
    .not('birthday', 'is', null);
  const rows = (data ?? []) as unknown as MemberRow[];

  const today = rows.filter((m) => isToday(m.birthday));
  const upcoming = rows.filter((m) => !isToday(m.birthday) && isUpcoming(m.birthday, 30))
    .sort((a, b) => daysUntil(a.birthday) - daysUntil(b.birthday));

  return (
    <div className="space-y-4">
      <header className="relative rounded-3xl overflow-hidden shadow-lg shadow-rose-900/15">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500 via-pink-500 to-orange-500" />
        <div aria-hidden className="absolute inset-0 opacity-25"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.4), transparent 35%)' }} />
        <div className="relative p-5 text-white">
          <div className="inline-flex items-center gap-1.5 text-blue-100 text-[10px] uppercase tracking-[0.18em] font-bold">
            <Gift size={11} /> Greetings
          </div>
          <h1 className="text-2xl font-extrabold leading-tight mt-1">
            Celebrate the<br/>Family of Lions
          </h1>
          <p className="text-[11px] text-pink-50/90 mt-1.5">
            {today.length > 0 ? `🎉 ${today.length} birthday${today.length === 1 ? '' : 's'} today` :
              upcoming.length > 0 ? `${upcoming.length} coming up in the next 30 days` :
              'No birthdays on file. Add member birth dates to see them here.'}
          </p>
        </div>
      </header>

      {today.length > 0 && (
        <section>
          <SectionTitle icon={Cake} label={`Today — ${today.length}`} tone="rose" />
          <div className="space-y-2">
            {today.map((m) => <PersonRow key={m.id} m={m} highlight />)}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <SectionTitle icon={Calendar} label={`Next 30 days — ${upcoming.length}`} tone="blue" />
          <div className="space-y-2">
            {upcoming.slice(0, 30).map((m) => <PersonRow key={m.id} m={m} />)}
          </div>
        </section>
      )}

      {today.length === 0 && upcoming.length === 0 && (
        <div className="bg-white rounded-2xl p-8 text-center text-sm text-gray-500 border border-gray-100">
          <Gift size={28} className="mx-auto text-gray-300 mb-2" />
          No upcoming birthdays. Once members fill in their birthday in /m/profile they&apos;ll appear here.
        </div>
      )}

      <Link href="/m/greetings/new"
        className="block bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-2xl p-4 shadow-md active:scale-[0.99] transition">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-bold text-blue-100">
              <Sparkles size={11} /> AI Greeting Generator
            </div>
            <div className="text-base font-extrabold mt-1">Create a branded greeting</div>
            <div className="text-[11px] text-blue-50 mt-0.5">Birthday · Anniversary · Award · Festival</div>
          </div>
          <ChevronRight size={20} />
        </div>
      </Link>
    </div>
  );
}

function SectionTitle({ icon: Icon, label, tone }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string; tone: 'rose' | 'blue';
}) {
  const color = tone === 'rose' ? 'text-rose-500' : 'text-blue-600';
  return (
    <div className="flex items-center gap-1.5 mb-2 px-1">
      <Icon size={12} className={color} />
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-600">{label}</h2>
    </div>
  );
}

function PersonRow({ m, highlight }: { m: MemberRow; highlight?: boolean }) {
  const initial = (m.name || '?').charAt(0).toUpperCase();
  const days = daysUntil(m.birthday);
  const age = ageOn(m.birthday);
  return (
    <div className={`flex items-center gap-3 rounded-2xl p-3 shadow-sm border ${
      highlight ? 'bg-gradient-to-r from-rose-50 to-blue-50 border-rose-200' : 'bg-white border-gray-100'
    }`}>
      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold ${
        highlight ? 'bg-gradient-to-br from-rose-500 to-blue-800' : 'bg-gradient-to-br from-blue-500 to-indigo-600'
      }`}>
        {highlight ? '🎂' : initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-navy-900 truncate">{m.name}</div>
        <div className="text-[11px] text-gray-500 mt-0.5">
          {highlight ? 'Birthday today' : days === 1 ? 'Tomorrow' : `In ${days} days`}
          {age && <> · turning {age}</>}
          {m.clubs?.name && <> · {m.clubs.name.replace(/^Lions Clubs? of\s+/i, '')}</>}
        </div>
      </div>
      <div className="flex gap-1">
        <Link href={`/m/greetings/new?for=${m.id}`} aria-label="Send greeting"
          className="w-9 h-9 rounded-full bg-blue-800 text-white flex items-center justify-center shadow-sm active:scale-95 transition">
          <Gift size={14} />
        </Link>
        {m.phone && (
          <a href={`https://wa.me/${m.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Happy Birthday, ${m.name}! 🎂 Wishing you a year of joy, service, and lion-hearted impact.`)}`}
            target="_blank" rel="noopener" aria-label="WhatsApp wish"
            className="w-9 h-9 rounded-full bg-green-50 text-green-700 flex items-center justify-center">
            <MessageCircle size={14} />
          </a>
        )}
      </div>
    </div>
  );
}
