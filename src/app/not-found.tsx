import Link from "next/link";
import { ArrowLeft, MapPinOff } from "lucide-react";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <span className="flex size-20 items-center justify-center rounded-3xl bg-sand text-crimson">
        <MapPinOff aria-hidden strokeWidth={1.75} className="size-9" />
      </span>
      <p className="stretch-wide mt-6 font-display text-sm font-bold uppercase tracking-[0.2em] text-rust">Error 404</p>
      <h1 className="mt-2 text-3xl font-bold text-ink">Page not found</h1>
      <p className="mt-2 max-w-sm text-[15px] text-ink-muted">It may have been moved, or you may not have access to it.</p>
      <Link href="/" className={buttonClass("primary", "md", "mt-7")}>
        <ArrowLeft aria-hidden />
        Go home
      </Link>
    </div>
  );
}
