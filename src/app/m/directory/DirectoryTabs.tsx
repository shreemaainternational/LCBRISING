import Link from 'next/link';

const TABS = [
  { key: 'district', label: 'District' },
  { key: 'clubs',    label: 'Clubs' },
  { key: 'others',   label: 'Others' },
];

export function DirectoryTabs({ active }: { active: string }) {
  return (
    <div className="bg-gray-100 rounded-full p-1 grid grid-cols-3 gap-1">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={`/m/directory?tab=${t.key}`}
          className={`text-center py-1.5 rounded-full text-xs font-bold transition ${
            active === t.key
              ? 'bg-white text-navy-900 shadow-sm'
              : 'text-gray-600'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
