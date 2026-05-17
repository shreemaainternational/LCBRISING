'use client';
import Link from 'next/link';
import { Wallet, ShieldCheck, Globe2 } from 'lucide-react';

const TABS = [
  { key: 'club',          label: 'Club Dues',          icon: Wallet,      desc: 'Member-billed dues — monthly, joining, admin' },
  { key: 'district',      label: 'District Dues',      icon: ShieldCheck, desc: 'Club-billed dues — per-capita, conference, training' },
  { key: 'international', label: 'International Dues', icon: Globe2,      desc: 'LCI dues — USD per-capita, charter, MJF / LCIF' },
] as const;

export function DuesTabs({ current }: { current: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = current === t.key;
        return (
          <Link key={t.key} href={`/admin/dues?tier=${t.key}`}
            className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
              active ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-300' : 'bg-white border-gray-200 hover:border-amber-200'
            }`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${active ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700'}`}>
              <Icon size={16} />
            </div>
            <div>
              <div className="font-semibold text-navy-800 text-sm">{t.label}</div>
              <div className="text-xs text-gray-500 leading-snug">{t.desc}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
