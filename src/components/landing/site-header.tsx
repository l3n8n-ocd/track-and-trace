"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Logo } from "../logo";
import { buttonClass, cn } from "../ui";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#tags", label: "Status tags" },
  { href: "/#privacy", label: "Privacy" },
];

// Sits on the dark hero, then turns into a cream bar once the page scrolls.
// Pages without a hero start with the cream bar.
export function SiteHeader({ appHref }: { appHref: string | null }) {
  const noHero = usePathname() !== "/";
  const [pastHero, setPastHero] = useState(false);
  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const scrolled = noHero || pastHero;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled ? "border-b border-line bg-cream/85 backdrop-blur-md" : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo tone={scrolled ? "dark" : "light"} />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                scrolled ? "text-ink-soft hover:bg-sand hover:text-ink" : "text-cream/80 hover:bg-white/10 hover:text-cream",
              )}
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {appHref ? (
            <Link href={appHref} className={buttonClass(scrolled ? "primary" : "light", "sm")}>
              Open Track-and-Trace
              <ArrowRight aria-hidden />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(
                  buttonClass("ghost", "sm"),
                  !scrolled && "text-cream hover:bg-white/10 hover:text-cream",
                )}
              >
                Log in
              </Link>
              <Link href="/register" className={buttonClass(scrolled ? "primary" : "light", "sm")}>
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
