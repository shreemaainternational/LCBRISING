import Link from 'next/link';
import { Bell } from 'lucide-react';

export function ZoneHeader({ member }: { member: { name: string; email: string } }) {
  const initial = (member.name || 'A').charAt(0).toUpperCase();
  return (
    <header className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-navy-900 tracking-tight">Zone Control</h1>
          <p className="text-sm text-gray-500">Welcome back, {member.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/zone/notifications" className="relative w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-700">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
          </Link>
          <div className="w-9 h-9 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold">
            {initial}
          </div>
        </div>
      </div>
    </header>
  );
}
