'use client';

import { useEffect } from 'react';

export default function AdminPaymentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[admin/payments] render error:', error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto mt-12">
      <div className="rounded-lg border border-red-300 bg-red-50 p-6">
        <h1 className="text-xl font-bold text-red-900 mb-2">
          Payments page failed to load
        </h1>
        <p className="text-sm text-red-800 mb-4">
          The server hit an unhandled error while rendering this page.
          The exact message is below — share it with your developer to debug.
        </p>
        <pre className="bg-white border border-red-200 rounded p-3 text-xs text-red-900 whitespace-pre-wrap break-words mb-3">
          {error.message || 'Unknown error'}
        </pre>
        {error.digest && (
          <p className="text-xs text-red-700 mb-3">
            Digest: <code className="bg-white px-1 rounded">{error.digest}</code>
          </p>
        )}
        <p className="text-xs text-red-800 mb-4">
          Common causes:
        </p>
        <ul className="text-xs text-red-800 list-disc list-inside space-y-1 mb-4">
          <li>
            PostgREST schema cache is stale. Run{' '}
            <code className="bg-white px-1 rounded">NOTIFY pgrst, &apos;reload schema&apos;;</code>{' '}
            in Supabase SQL Editor.
          </li>
          <li>
            Missing environment variable (Supabase URL, anon key, or service-role
            key). Check Vercel → Settings → Environment Variables.
          </li>
          <li>
            Database table missing. Re-apply the payment migrations 0010-0015.
          </li>
        </ul>
        <div className="flex gap-2">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700"
          >
            Try again
          </button>
          <a
            href="/admin"
            className="px-4 py-2 rounded-md border border-red-300 text-red-900 text-sm font-medium hover:bg-red-100"
          >
            Back to admin dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
