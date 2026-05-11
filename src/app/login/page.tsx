import { Card, CardContent } from '@/components/ui/card';
import { integrations, env } from '@/lib/env';
import LoginForm from './LoginForm';

export default function LoginPage() {
  const oidcEnabled = integrations.lionsOidc;
  const providerLabel = env.LIONS_OIDC_PROVIDER_LABEL ?? 'Lions';

  return (
    <main className="min-h-screen grid place-items-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <h1 className="text-2xl font-bold text-navy-800 text-center mb-1">
            🦁 Member Portal
          </h1>
          <p className="text-center text-sm text-gray-500 mb-6">
            Sign in to continue
          </p>

          {oidcEnabled && (
            <>
              <a
                href="/api/auth/oidc/login"
                className="block w-full text-center rounded-md bg-navy-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-800 transition"
              >
                Login with {providerLabel}
              </a>
              <div className="relative my-6 text-center text-xs uppercase tracking-wider text-gray-400">
                <span className="bg-white px-2 relative z-10">or with email</span>
                <span className="absolute inset-x-0 top-1/2 h-px bg-gray-200" aria-hidden />
              </div>
            </>
          )}

          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
