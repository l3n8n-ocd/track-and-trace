import Link from "next/link";
import { twMerge } from "tailwind-merge";
import type { ComponentProps, ReactNode } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

// Joins class names; when two classes set the same property, the later one
// wins, so callers can override a component's defaults.
export function cn(...classes: (string | false | null | undefined)[]) {
  return twMerge(classes.filter(Boolean).join(" "));
}

// Icons are drawn at one stroke weight everywhere so they read clearly at
// small sizes.
export const ICON_STROKE = 2;

type Variant = "primary" | "secondary" | "danger" | "ghost" | "success" | "light";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-crimson text-cream hover:bg-oxblood disabled:bg-crimson/40",
  secondary:
    "bg-paper text-ink ring-1 ring-inset ring-line-strong hover:bg-sand hover:ring-ink-faint disabled:text-ink-faint",
  danger: "bg-paper text-berry ring-1 ring-inset ring-berry/30 hover:bg-berry-tint disabled:text-ink-faint",
  ghost: "text-ink-soft hover:bg-sand hover:text-ink",
  // The affirmative action in a decision (approve, record a release).
  success: "bg-amber text-ink hover:bg-[#f08400] disabled:bg-amber/40 disabled:text-ink/50",
  // For use on the ember gradient.
  light: "bg-cream text-oxblood hover:bg-white",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(
    "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-[background-color,box-shadow,color,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 [&_svg]:size-[18px] [&_svg]:shrink-0",
    variants[variant],
    sizes[size],
    extra,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

// Focus is a single crimson edge: the border darkens and thickens by one
// pixel (an inset shadow, so nothing shifts), with no glow or outline.
export const fieldClass =
  "block w-full rounded-xl border border-line-strong bg-paper px-3.5 text-[15px] text-ink transition-[border-color,box-shadow] placeholder:text-ink-faint hover:border-ink-faint focus:border-crimson focus:shadow-[inset_0_0_0_1px_var(--color-crimson)] focus:outline-none focus-visible:outline-none disabled:bg-sand disabled:text-ink-muted aria-[invalid=true]:border-berry aria-[invalid=true]:focus:shadow-[inset_0_0_0_1px_var(--color-berry)]";

function FieldIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <Icon
      aria-hidden
      strokeWidth={ICON_STROKE}
      className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-muted transition-colors group-focus-within:text-crimson"
    />
  );
}

export function Input({ className, icon, ...props }: ComponentProps<"input"> & { icon?: LucideIcon }) {
  const input = <input className={cn(fieldClass, "h-11", icon && "pl-11", className)} {...props} />;
  if (!icon) return input;
  return (
    <div className="group relative">
      <FieldIcon icon={icon} />
      {input}
    </div>
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldClass, "min-h-28 py-3 leading-relaxed", className)} {...props} />;
}

export function Select({ className, icon, ...props }: ComponentProps<"select"> & { icon?: LucideIcon }) {
  return (
    <div className={cn("group relative", className)}>
      {icon && <FieldIcon icon={icon} />}
      <select className={cn(fieldClass, "h-11 cursor-pointer appearance-none pr-10", icon && "pl-11")} {...props} />
      <ChevronDown
        aria-hidden
        strokeWidth={ICON_STROKE}
        className="pointer-events-none absolute right-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-muted"
      />
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="flex items-baseline gap-1 text-sm font-semibold text-ink">
        {label}
        {required && (
          <span className="text-crimson" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className="text-[13px] leading-snug text-ink-muted">{hint}</p>}
      {error && (
        <p className="flex items-start gap-1.5 text-[13px] font-medium text-berry">
          <CircleAlert aria-hidden strokeWidth={ICON_STROKE} className="mt-px size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

// Empty content inside a card: a quiet icon and one line, so empty and
// filled cards sit at similar heights.
export function CardEmpty({ icon: Icon, children }: { icon?: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-cream/70 px-4 py-3.5 text-sm text-ink-muted">
      {Icon && <Icon aria-hidden strokeWidth={ICON_STROKE} className="size-[18px] shrink-0 text-ink-faint" />}
      <span>{children}</span>
    </div>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("min-w-0 rounded-2xl border border-line bg-paper p-5 sm:p-6", className)} {...props} />;
}

// Card title row: icon, heading, optional description and trailing action.
export function CardHeader({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-sand text-crimson">
            <Icon aria-hidden strokeWidth={ICON_STROKE} className="size-[18px]" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

type Tone = "gray" | "red" | "amber" | "green" | "blue" | "purple" | "dark";
const tones: Record<Tone, string> = {
  gray: "bg-sand text-ink-soft ring-line-strong",
  red: "bg-berry-tint text-berry ring-berry/25",
  amber: "bg-amber-tint text-amber-deep ring-amber/40",
  green: "bg-crimson-tint text-crimson ring-crimson/25",
  blue: "bg-paper text-ink-soft ring-line-strong",
  purple: "bg-rust-tint text-rust ring-rust/30",
  dark: "bg-ink text-cream ring-ink",
};

export function Badge({ tone = "gray", icon: Icon, children }: { tone?: Tone; icon?: LucideIcon; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-xs font-semibold ring-1 ring-inset",
        tones[tone],
      )}
    >
      {Icon && <Icon aria-hidden strokeWidth={2.25} className="size-3.5" />}
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  icon: Icon,
}: {
  title: string;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        {Icon && (
          <span className="hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-oxblood text-cream sm:flex">
            <Icon aria-hidden strokeWidth={ICON_STROKE} className="size-6" />
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-rust">{eyebrow}</div>
          )}
          <h1 className="text-2xl font-bold text-ink sm:text-[28px] sm:leading-tight">{title}</h1>
          {description && <div className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-muted">{description}</div>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-line bg-paper px-6 py-12 text-center">
      {Icon && (
        <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-sand text-crimson">
          <Icon aria-hidden strokeWidth={ICON_STROKE} className="size-6" />
        </span>
      )}
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      {children && <div className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const alertStyles = {
  red: { box: "bg-berry-tint text-[#5c0020] border-berry/25", icon: CircleAlert, iconClass: "text-berry" },
  green: { box: "bg-amber-tint text-[#5a2a05] border-amber/40", icon: CircleCheck, iconClass: "text-rust" },
  amber: { box: "bg-rust-tint text-[#5a2205] border-rust/25", icon: TriangleAlert, iconClass: "text-rust" },
  blue: { box: "bg-paper text-ink-soft border-line-strong", icon: Info, iconClass: "text-crimson" },
};

export function Alert({ tone = "red", children }: { tone?: keyof typeof alertStyles; children: ReactNode }) {
  const s = alertStyles[tone];
  const Icon = s.icon;
  return (
    <div
      role={tone === "red" ? "alert" : "status"}
      className={cn("flex animate-fade gap-3 rounded-2xl border px-4 py-3 text-sm leading-relaxed", s.box)}
    >
      <Icon aria-hidden strokeWidth={ICON_STROKE} className={cn("mt-0.5 size-[18px] shrink-0", s.iconClass)} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function DetailList({ items, columns = 2 }: { items: [string, ReactNode][]; columns?: 1 | 2 | 3 }) {
  return (
    <dl
      className={cn(
        "grid grid-cols-1 gap-x-8 gap-y-4",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
      )}
    >
      {items.map(([term, value]) => (
        <div key={term} className="min-w-0">
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{term}</dt>
          <dd className="mt-1 whitespace-pre-line break-words text-[15px] text-ink">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

// Link-based segmented tabs (filters live in the URL).
export function Tabs({
  items,
  className,
}: {
  items: { href: string; label: ReactNode; active: boolean; count?: number; icon?: LucideIcon }[];
  className?: string;
}) {
  return (
    <nav className={cn("-mx-1 flex gap-1 overflow-x-auto px-1 pb-1", className)} aria-label="Filter">
      {items.map((t) => {
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.active ? "page" : undefined}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors",
              t.active ? "bg-ink text-cream" : "text-ink-soft hover:bg-sand hover:text-ink",
            )}
          >
            {Icon && <Icon aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
            {t.label}
            {t.count !== undefined && (
              <span
                className={cn(
                  "min-w-5 rounded-full px-1.5 text-center text-xs tabular-nums leading-5",
                  t.active ? "bg-cream/15 text-cream" : "bg-sand text-ink-muted",
                )}
              >
                {t.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function Pagination({
  page,
  pages,
  href,
  summary,
}: {
  page: number;
  pages: number;
  href: (p: number) => string;
  summary?: ReactNode;
}) {
  if (pages <= 1) return null;
  const arrow = "inline-flex size-9 items-center justify-center rounded-xl border border-line bg-paper text-ink hover:bg-sand";
  return (
    <nav className="mt-6 flex items-center justify-center gap-3 text-sm" aria-label="Pagination">
      {page > 1 ? (
        <Link href={href(page - 1)} className={arrow} aria-label="Previous page">
          <ChevronLeft aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
        </Link>
      ) : (
        <span className={cn(arrow, "opacity-40")} aria-hidden>
          <ChevronLeft strokeWidth={ICON_STROKE} className="size-4" />
        </span>
      )}
      <span className="text-ink-muted">
        Page <span className="font-semibold text-ink">{page}</span> of {pages}
        {summary && <> · {summary}</>}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className={arrow} aria-label="Next page">
          <ChevronRight aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
        </Link>
      ) : (
        <span className={cn(arrow, "opacity-40")} aria-hidden>
          <ChevronRight strokeWidth={ICON_STROKE} className="size-4" />
        </span>
      )}
    </nav>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-sand font-display text-xs font-bold text-crimson ring-1 ring-inset ring-line-strong",
        className,
      )}
    >
      {initials || "?"}
    </span>
  );
}

// Filter bars on list pages.
export function Toolbar({ className, ...props }: ComponentProps<"form">) {
  return <form className={cn("mb-5 rounded-2xl border border-line bg-paper p-3 sm:p-4", className)} {...props} />;
}

// Highlighted item: a soft tinted panel with a thin inset bar and an icon
// tile. Used for anything that needs attention (to-dos, office notes,
// announcements, unread items) instead of thick or edge borders.
const noticeTones = {
  amber: { box: "border-amber/30 bg-amber-tint/50", bar: "bg-amber/70", tile: "bg-amber-tint text-amber-deep" },
  rust: { box: "border-rust/20 bg-rust-tint/45", bar: "bg-rust/45", tile: "bg-rust-tint text-rust" },
  crimson: { box: "border-crimson/15 bg-crimson-tint/45", bar: "bg-crimson/35", tile: "bg-crimson-tint text-crimson" },
  berry: { box: "border-berry/20 bg-berry-tint/50", bar: "bg-berry/40", tile: "bg-berry-tint text-berry" },
  neutral: { box: "border-line bg-cream/70", bar: "bg-line-strong", tile: "bg-sand text-crimson" },
};

export type NoticeTone = keyof typeof noticeTones;

export function Notice({
  tone = "rust",
  icon: Icon,
  title,
  children,
  meta,
  action,
  className,
}: {
  tone?: NoticeTone;
  icon?: LucideIcon;
  title?: ReactNode;
  children?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const t = noticeTones[tone];
  return (
    <div className={cn("flex gap-3.5 rounded-2xl border p-4", t.box, className)}>
      <span aria-hidden className={cn("w-[3px] shrink-0 self-stretch rounded-full", t.bar)} />
      {Icon && (
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", t.tile)}>
          <Icon aria-hidden strokeWidth={ICON_STROKE} className="size-[18px]" />
        </span>
      )}
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className="font-semibold text-ink">{title}</p>}
        {children && <div className={cn("leading-relaxed text-ink-soft", Boolean(title) && "mt-0.5")}>{children}</div>}
        {meta && <p className="mt-1 text-xs text-ink-muted">{meta}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
