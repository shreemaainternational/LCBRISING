'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Search, Filter, X } from 'lucide-react';

interface Props { initialQ: string; initialCity: string; initialGender: string }

export function BeneficiarySearch({ initialQ, initialCity, initialGender }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const [city, setCity] = useState(initialCity);
  const [gender, setGender] = useState(initialGender);
  const [pending, start] = useTransition();

  function apply() {
    const p = new URLSearchParams(sp);
    if (q) p.set('q', q); else p.delete('q');
    if (city) p.set('city', city); else p.delete('city');
    if (gender) p.set('gender', gender); else p.delete('gender');
    start(() => router.push(`/admin/beneficiaries?${p.toString()}`));
  }
  function clear() {
    setQ(''); setCity(''); setGender('');
    start(() => router.push(`/admin/beneficiaries`));
  }

  return (
    <div className="bg-white border rounded-lg p-3 flex flex-wrap gap-2 items-center">
      <div className="flex-1 min-w-[240px] relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          placeholder="Search name, phone or email…"
          className="w-full pl-9 pr-3 py-2 border rounded-md text-sm"
        />
      </div>
      <input
        value={city}
        onChange={(e) => setCity(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && apply()}
        placeholder="City"
        className="px-3 py-2 border rounded-md text-sm w-32"
      />
      <select
        value={gender}
        onChange={(e) => setGender(e.target.value)}
        className="px-3 py-2 border rounded-md text-sm bg-white"
      >
        <option value="">All genders</option>
        <option value="female">Female</option>
        <option value="male">Male</option>
        <option value="other">Other</option>
        <option value="undisclosed">Undisclosed</option>
      </select>
      <button
        type="button"
        onClick={apply}
        disabled={pending}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-60"
      >
        <Filter size={14} /> Apply
      </button>
      {(initialQ || initialCity || initialGender) && (
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-md border text-sm text-gray-600 hover:bg-gray-50"
        >
          <X size={14} /> Clear
        </button>
      )}
    </div>
  );
}
