import Link from "next/link";

// `compact` hides the name on wide screens, where the admin navigation needs
// the room; below that width the navigation collapses into a menu.
export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="flex shrink-0 items-center gap-2 whitespace-nowrap font-semibold text-slate-900">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white">
        TT
      </span>
      <span className={`text-lg tracking-tight${compact ? " xl:sr-only" : ""}`}>Track-and-Trace</span>
    </Link>
  );
}
