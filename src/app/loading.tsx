export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-5xl px-4 py-8" aria-busy="true">
        <p className="sr-only" role="status">
          Loading your documents...
        </p>
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        {[0, 1].map((section) => (
          <div key={section} className="mt-8 space-y-2">
            <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-14 animate-pulse rounded-lg bg-white" />
            <div className="h-14 animate-pulse rounded-lg bg-white" />
          </div>
        ))}
      </main>
    </div>
  );
}
