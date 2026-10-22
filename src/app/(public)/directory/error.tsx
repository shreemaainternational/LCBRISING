'use client';

export default function DirectoryError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page py-20 text-center">
      <h2 className="text-2xl font-bold text-navy-800 mb-3">The directory couldn’t be loaded</h2>
      <p className="text-gray-600 mb-6">Please try again in a moment.</p>
      <button type="button" onClick={reset} className="btn-navy inline-flex items-center rounded-md px-5 py-2.5 text-sm">
        Try again
      </button>
    </div>
  );
}
