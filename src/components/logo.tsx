import Link from "next/link";
import { cn } from "./ui";

// Set to true if the SVG files already include the "Track-and-Trace" name,
// so the text beside the mark isn't shown twice.
const LOGO_HAS_WORDMARK = false;

// `tone="light"` uses the white logo, for the ember gradient and other dark
// backgrounds. `compact` shows the mark only.
export function Logo({
  href = "/",
  tone = "dark",
  compact = false,
  className,
}: {
  href?: string;
  tone?: "dark" | "light";
  compact?: boolean;
  className?: string;
}) {
  const light = tone === "light";
  return (
    <Link
      href={href}
      aria-label="Track-and-Trace home"
      className={cn("group flex shrink-0 items-center gap-2.5 whitespace-nowrap", className)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={light ? "/Track-and-Trace-logoW.svg" : "/Track-and-Trace-logo.svg"}
        alt=""
        className="h-9 w-auto shrink-0 transition-transform duration-300 group-hover:-rotate-6"
      />
      {!LOGO_HAS_WORDMARK && !compact && (
        <span
          className={cn(
            "font-display text-[17px] font-bold leading-none tracking-tight",
            light ? "text-cream" : "text-ink",
          )}
          style={{ fontStretch: "115%" }}
        >
          Track<span className={light ? "text-amber" : "text-crimson"}>-and-</span>Trace
        </span>
      )}
    </Link>
  );
}
