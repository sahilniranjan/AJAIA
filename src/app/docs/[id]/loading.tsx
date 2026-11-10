export default function DocumentLoading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6" aria-busy="true">
      <span className="sr-only" role="status">
        Loading document...
      </span>
      <div className="animate-pulse space-y-4" aria-hidden="true">
        <div className="h-4 w-32 rounded bg-slate-200" />
        <div className="h-8 w-2/3 rounded bg-slate-200" />
        <div className="h-10 rounded-lg bg-slate-200" />
        <div className="h-96 rounded-lg border border-slate-200 bg-white" />
      </div>
    </main>
  );
}
