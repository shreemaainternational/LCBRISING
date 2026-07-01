import { redirect } from 'next/navigation';
import { integrations, isDevAuthBypass, env } from '@/lib/env';
import LoginForm from './LoginForm';

export default async function LoginPage() {
  // In local development with the bypass on, skip the form and go
  // straight to /admin. Never active in production.
  if (isDevAuthBypass()) redirect('/admin');

  const oidcEnabled = integrations.lionsOidc;
  const providerLabel = env.LIONS_OIDC_PROVIDER_LABEL ?? 'Lions';

  return (
    <main className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-blue-700 flex flex-col items-center justify-center p-4">
      {/* Brand */}
      <div className="text-center mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={env.NEXT_PUBLIC_BRAND_LOGO_URL || '/logo.png'}
          alt="Lions Club of Baroda Rising Star"
          className="h-20 w-20 rounded-2xl object-cover mx-auto mb-5 shadow-lg ring-2 ring-brand-300"
        />
        <h1 className="text-3xl md:text-4xl font-bold text-white">
          Lions Club CRM
        </h1>
        <p className="text-blue-200 mt-1">AI-Powered Management System</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <h2 className="text-2xl font-bold text-navy-800 mb-1">Welcome Back</h2>
        <p className="text-sm text-gray-500 mb-6">
          Sign in to access your dashboard
        </p>

        {oidcEnabled && (
          <>
            <a
              href="/api/auth/oidc/login"
              className="btn-navy block w-full text-center rounded-lg px-4 py-3 text-sm"
            >
              Login with {providerLabel}
            </a>
            <div className="relative my-6 text-center text-xs uppercase tracking-wider text-gray-400">
              <span className="bg-white px-2 relative z-10">or with email</span>
              <span
                className="absolute inset-x-0 top-1/2 h-px bg-gray-200"
                aria-hidden
              />
            </div>
          </>
        )}

        <LoginForm />
      </div>

      <p className="text-blue-200/70 text-xs mt-8">
        © {new Date().getFullYear()} Lions Club of Baroda Rising Star
      </p>
    </main>
  );
}
