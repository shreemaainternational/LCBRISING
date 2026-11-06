export default function DirectoryLoading() {
  return (
    <div className="container-page py-16" aria-busy="true" aria-live="polite">
      <div className="h-8 w-56 rounded bg-gray-200 animate-pulse mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
      <span className="sr-only">Loading the directory…</span>
    </div>
  );
}
