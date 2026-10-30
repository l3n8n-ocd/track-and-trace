import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "./ui";

// Dashboard banner: the ember gradient with a light grain.
export function Banner({
  eyebrow,
  title,
  children,
  actions,
  aside,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("bg-ember-soft relative isolate overflow-hidden rounded-3xl text-cream", className)}>
      <div aria-hidden className="noise absolute inset-0 -z-10" />
      <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          {eyebrow && (
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber">{eyebrow}</div>
          )}
          <h1 className="text-[28px] font-bold leading-[1.08] text-cream sm:text-4xl">{title}</h1>
          {children && <div className="mt-3 text-[15px] leading-relaxed text-cream/80">{children}</div>}
          {actions && <div className="mt-6 flex flex-wrap gap-2.5">{actions}</div>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
    </section>
  );
}

// A number with a label, for use inside the banner.
export function BannerStat({ value, label, href }: { value: number; label: string; href?: string }) {
  const inner = (
    <>
      <span className="block font-display text-2xl font-bold sm:text-3xl tabular-nums leading-none text-cream">{value}</span>
      <span className="mt-1.5 block text-xs font-medium text-cream/70">{label}</span>
    </>
  );
  const cls = "block min-w-0 rounded-2xl border border-cream/15 bg-ink/20 px-3 py-3 backdrop-blur-sm sm:min-w-28 sm:px-4";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:border-cream/35 hover:bg-ink/30")}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
