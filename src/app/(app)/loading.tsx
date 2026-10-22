export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-1/3 rounded bg-slate-200" />
      <div className="h-24 rounded-lg bg-slate-200" />
      <div className="h-24 rounded-lg bg-slate-200" />
    </div>
  );
}
