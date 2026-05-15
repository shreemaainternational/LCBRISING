import Link from 'next/link';
import { getCurrentMember } from '@/lib/auth';
import { LogoutButton } from '@/components/admin/LogoutButton';
import { Mail, Phone, Shield, LayoutDashboard, ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MobileProfile() {
  const member = await getCurrentMember();
  if (!member) return null;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-navy-900 to-blue-700 rounded-2xl p-5 text-white shadow-lg">
        <div className="w-20 h-20 rounded-full bg-amber-500 text-white flex items-center justify-center text-3xl font-bold mb-3">
          {member.name.charAt(0).toUpperCase()}
        </div>
        <h1 className="text-xl font-bold">{member.name}</h1>
        <p className="text-sm text-amber-200/90 capitalize mt-0.5">{member.role}</p>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <Row icon={Mail}  label="Email" value={member.email} />
        {member.phone && <Row icon={Phone} label="Phone" value={member.phone} />}
        <Row icon={Shield} label="Status" value={member.status} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm divide-y">
        <LinkRow icon={LayoutDashboard} href="/admin" label="Open Desktop CRM" external />
        <LinkRow icon={ExternalLink} href="/portal" label="Member Portal" external />
      </div>

      <div className="pt-2">
        <LogoutButton />
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
        <div className="text-sm font-medium text-gray-800 truncate capitalize">{value}</div>
      </div>
    </div>
  );
}

function LinkRow({ icon: Icon, href, label, external }: {
  icon: React.ComponentType<{ size?: number }>; href: string; label: string; external?: boolean;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 p-4">
      <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
        <Icon size={16} />
      </div>
      <div className="flex-1 text-sm font-semibold text-navy-800">{label}</div>
      {external && <ExternalLink size={14} className="text-gray-300" />}
    </Link>
  );
}
