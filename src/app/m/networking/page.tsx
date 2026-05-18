import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentMember } from '@/lib/auth';
import {
  Network, Briefcase, Phone, MessageCircle, Mail, Search,
  Trophy, ArrowUpRight, Plus, Users, Sparkles,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props { searchParams: Promise<{ q?: string }> }

interface DirRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  club_id: string | null;
  clubs: { name?: string } | null;
}

export default async function MobileNetworking({ searchParams }: Props) {
  const { q = '' } = await searchParams;
  const me = await getCurrentMember();
  const db = createAdminClient();

  const { data: members } = await db.from('members')
    .select('id, name, email, phone, role, club_id, clubs(name)')
    .is('deleted_at', null)
    .order('name')
    .limit(50);
  const list = ((members ?? []) as unknown as DirRow[])
    .filter((m) => me ? m.id !== me.id : true)
    .filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase()) || (m.clubs?.name ?? '').toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <header className="relative rounded-3xl overflow-hidden shadow-lg shadow-blue-900/15">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B2D6B] via-purple-700 to-violet-900" />
        <div aria-hidden className="absolute inset-0 opacity-25"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(244,180,0,0.5), transparent 35%)' }} />
        <div className="relative p-5 text-white">
          <div className="inline-flex items-center gap-1.5 text-amber-200 text-[10px] uppercase tracking-[0.18em] font-bold">
            <Network size={11} /> Networking
          </div>
          <h1 className="text-2xl font-extrabold leading-tight mt-1">
            Grow with the<br/>Lions Family
          </h1>
          <p className="text-[11px] text-blue-100/85 mt-1.5">
            LinkedIn-style discovery, business exchange, referrals.
          </p>
          <div className="grid grid-cols-4 gap-2 mt-4">
            <StatTile label="Inquiries" value="0" />
            <StatTile label="Referrals" value="0" />
            <StatTile label="Deals" value="₹0" />
            <StatTile label="Rank" value="—" />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/m/networking/business-wall"
          className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 active:scale-95 transition">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 text-amber-700 flex items-center justify-center mb-2">
            <Briefcase size={18} />
          </div>
          <div className="text-sm font-bold text-navy-900">Business Wall</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Member deals & promotions</div>
        </Link>
        <Link href="/m/networking/refer"
          className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 active:scale-95 transition">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-700 flex items-center justify-center mb-2">
            <Plus size={18} />
          </div>
          <div className="text-sm font-bold text-navy-900">Give Referral</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Refer a member</div>
        </Link>
        <Link href="/m/networking/leaderboard"
          className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 active:scale-95 transition">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 text-purple-700 flex items-center justify-center mb-2">
            <Trophy size={18} />
          </div>
          <div className="text-sm font-bold text-navy-900">Top Networkers</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Monthly leaderboard</div>
        </Link>
        <Link href="/m/profile"
          className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 active:scale-95 transition">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 text-blue-700 flex items-center justify-center mb-2">
            <Sparkles size={18} />
          </div>
          <div className="text-sm font-bold text-navy-900">My Profile</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Business card · QR</div>
        </Link>
      </div>

      <form className="relative" action="/m/networking">
        <input type="search" name="q" defaultValue={q}
          placeholder="Search members or clubs…"
          className="w-full pl-9 pr-3 py-2.5 rounded-2xl border bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      </form>

      <section>
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600">Members · {list.length}</h2>
        </div>
        <div className="space-y-2">
          {list.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-xs text-gray-500 border border-gray-100">
              <Users size={20} className="mx-auto text-gray-300 mb-2" />
              No members found.
            </div>
          ) : list.map((m) => <MemberRow key={m.id} m={m} />)}
        </div>
      </section>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/10 backdrop-blur border border-white/15 rounded-xl px-2 py-2 text-center">
      <div className="text-[9px] uppercase tracking-wider text-blue-100/80 font-bold">{label}</div>
      <div className="text-base font-extrabold text-white">{value}</div>
    </div>
  );
}

function MemberRow({ m }: { m: DirRow }) {
  const initial = (m.name || '?').charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#0B2D6B] to-blue-600 text-white flex items-center justify-center font-bold">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-navy-900 truncate">{m.name}</div>
        <div className="text-[11px] text-gray-500 mt-0.5 truncate">
          {m.role && <span className="capitalize">{m.role.replace(/_/g, ' ')}</span>}
          {m.clubs?.name && <> · {m.clubs.name.replace(/^Lions Clubs? of\s+/i, '')}</>}
        </div>
      </div>
      <div className="flex gap-1">
        {m.phone && (
          <a href={`tel:${m.phone}`} aria-label="Call"
            className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Phone size={14} />
          </a>
        )}
        {m.phone && (
          <a href={`https://wa.me/${m.phone.replace(/[^\d]/g, '')}`} target="_blank" rel="noopener" aria-label="WhatsApp"
            className="w-9 h-9 rounded-full bg-green-50 text-green-700 flex items-center justify-center">
            <MessageCircle size={14} />
          </a>
        )}
        {m.email && (
          <a href={`mailto:${m.email}`} aria-label="Email"
            className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center">
            <Mail size={14} />
          </a>
        )}
        <Link href={`/m/networking/refer?to=${m.id}`} aria-label="Refer"
          className="w-9 h-9 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
          <ArrowUpRight size={14} />
        </Link>
      </div>
    </div>
  );
}
