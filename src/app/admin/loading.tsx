export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded-full bg-sand" />
        <div className="h-8 w-2/5 rounded-xl bg-sand" />
      </div>
      <div className="h-36 rounded-2xl bg-sand" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-24 rounded-2xl bg-sand" />
        <div className="h-24 rounded-2xl bg-sand" />
        <div className="h-24 rounded-2xl bg-sand" />
      </div>
      <div className="h-48 rounded-2xl bg-sand" />
    </div>
  );
}
