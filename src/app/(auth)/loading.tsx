export default function Loading() {
  return (
    <div className="w-full max-w-[560px] animate-pulse space-y-6" role="status" aria-label="Loading">
      <span className="sr-only">Loading…</span>
      <div className="h-9 w-2/3 rounded-xl bg-sand" />
      <div className="h-4 w-full rounded-full bg-sand" />
      <div className="h-40 rounded-2xl bg-sand" />
      <div className="h-11 rounded-xl bg-sand" />
    </div>
  );
}
