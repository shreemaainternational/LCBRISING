import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { getCurrentMember } from '@/lib/auth';
import { isMfaRequired, MFA_SETTINGS_PATH } from '@/lib/mfa';
import { MfaSettings } from './MfaSettings';

export const metadata = { title: 'Two-factor authentication' };
export const dynamic = 'force-dynamic';

export default async function MfaSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ required?: string; redirectTo?: string; recovered?: string }>;
}) {
  const member = await getCurrentMember();
  if (!member) redirect(`/login?redirectTo=${MFA_SETTINGS_PATH}`);

  const sp = await searchParams;
  const redirectTo =
    sp.redirectTo && sp.redirectTo.startsWith('/') && !sp.redirectTo.startsWith('//')
      ? sp.redirectTo
      : null;

  return (
    <div className="max-w-3xl">
      <div className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase mb-2">
        Settings › MFA
      </div>
      <h1 className="text-2xl font-bold text-navy-800 mb-1 flex items-center gap-2">
        <ShieldCheck size={22} aria-hidden /> Two-factor authentication
      </h1>
      <p className="text-gray-500 mb-8">
        Add a 6-digit code from your phone to every sign-in. Works with Google Authenticator,
        1Password, Authy and any TOTP app.
      </p>

      <MfaSettings
        email={member.email ?? ''}
        required={isMfaRequired()}
        forced={sp.required === '1'}
        recovered={sp.recovered === '1'}
        redirectTo={redirectTo}
        backupCodesAvailable={Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)}
      />
    </div>
  );
}
