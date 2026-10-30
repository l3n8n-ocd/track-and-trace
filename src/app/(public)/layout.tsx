import Link from "next/link";
import { SiteHeader } from "@/components/landing/site-header";
import { Logo } from "@/components/logo";
import { getSessionUser } from "@/lib/session";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return (
    <>
      <SiteHeader appHref={user ? (user.role === "admin" ? "/admin" : "/dashboard") : null} />
      <main className="flex-1">{children}</main>
      <footer className="overflow-hidden border-t border-line bg-cream">
        <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-sm">
              <Logo />
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                The lost and found system of Bulacan State University – Main Campus. Run by the Lost and Found Office.
              </p>
            </div>
            <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
              <Link href="/#how" className="text-ink-soft hover:text-crimson">How it works</Link>
              <Link href="/login" className="text-ink-soft hover:text-crimson">Log in</Link>
              <Link href="/#tags" className="text-ink-soft hover:text-crimson">Status tags</Link>
              <Link href="/register" className="text-ink-soft hover:text-crimson">Register</Link>
              <Link href="/privacy" className="text-ink-soft hover:text-crimson">Data privacy notice</Link>
            </nav>
          </div>
          <svg aria-hidden viewBox="0 0 1000 130" className="mt-10 block w-full select-none">
            <defs>
              <linearGradient id="wordmark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#8C001B" stopOpacity="0.28" />
                <stop offset="1" stopColor="#8C001B" stopOpacity="0" />
              </linearGradient>
            </defs>
            <text
              x="0"
              y="122"
              textLength="1000"
              lengthAdjust="spacingAndGlyphs"
              fill="url(#wordmark)"
              fontFamily="var(--font-archivo)"
              fontWeight="900"
              fontSize="150"
              style={{ fontStretch: "125%" }}
            >
              Track-and-Trace
            </text>
          </svg>
        </div>
      </footer>
    </>
  );
}
