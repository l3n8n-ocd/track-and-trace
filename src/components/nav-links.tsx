"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  Bell,
  FileText,
  FolderArchive,
  Inbox,
  LayoutDashboard,
  Megaphone,
  Menu,
  Plus,
  ScanSearch,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "./logo";
import { ICON_STROKE, cn } from "./ui";

export type NavSection = "user" | "admin";
// Badge counts keyed by href; "urgent" counts are drawn in amber.
export type NavCounts = Record<string, { value: number; urgent?: boolean }>;

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const NAV: Record<NavSection, NavGroup[]> = {
  user: [
    {
      label: "Home",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/notifications", label: "Notifications", icon: Bell },
      ],
    },
    {
      label: "Items",
      items: [
        { href: "/search", label: "Search found items", icon: Search },
        { href: "/reports", label: "My reports", icon: FileText },
        { href: "/matches", label: "Matches", icon: ScanSearch },
        { href: "/claims", label: "My claims", icon: ShieldCheck },
      ],
    },
  ],
  admin: [
    {
      label: "Workflow",
      items: [
        { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
        { href: "/admin/reports", label: "Reports", icon: FileText },
        { href: "/admin/claims", label: "Claims", icon: Inbox },
      ],
    },
    {
      label: "People & updates",
      items: [
        { href: "/admin/users", label: "Users", icon: Users },
        { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
      ],
    },
    {
      label: "Office",
      items: [
        { href: "/admin/records", label: "Records", icon: FolderArchive },
        { href: "/admin/settings", label: "Settings", icon: Settings },
      ],
    },
  ],
};

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

// Small spinner on the link being opened, while the next page loads.
function PendingDot() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn(
        "size-3.5 shrink-0 rounded-full border-2 border-current border-r-transparent transition-opacity",
        pending ? "animate-spin opacity-70" : "opacity-0",
      )}
    />
  );
}

function NavGroups({ section, counts, onNavigate }: { section: NavSection; counts: NavCounts; onNavigate?: () => void }) {
  const pathname = usePathname();
  const container = useRef<HTMLDivElement>(null);
  const links = useRef(new Map<string, HTMLAnchorElement>());
  const [indicator, setIndicator] = useState<{ top: number; height: number; ready: boolean } | null>(null);
  const groups = NAV[section];
  const activeHref = groups.flatMap((g) => g.items).find((i) => isActive(pathname, i))?.href;

  // Slide the highlight to the active link.
  useLayoutEffect(() => {
    const el = activeHref ? links.current.get(activeHref) : null;
    if (!el || !container.current) {
      setIndicator(null);
      return;
    }
    setIndicator((prev) => ({ top: el.offsetTop, height: el.offsetHeight, ready: prev !== null }));
  }, [activeHref]);

  return (
    <div ref={container} className="relative space-y-6">
      {indicator && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-x-0 rounded-2xl bg-crimson/30 ring-1 ring-inset ring-rust/45",
            indicator.ready && "transition-[transform,height] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          )}
          style={{ transform: `translateY(${indicator.top}px)`, height: indicator.height, top: 0 }}
        >
          <span className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-amber" />
        </span>
      )}
      {groups.map((g) => (
        <div key={g.label}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-cream/40">{g.label}</p>
          <ul className="space-y-1">
            {g.items.map((item) => {
              const active = item.href === activeHref;
              const count = counts[item.href];
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    ref={(el) => {
                      if (el) links.current.set(item.href, el);
                      else links.current.delete(item.href);
                    }}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex h-11 items-center gap-3 rounded-2xl px-3 text-[15px] font-medium transition-colors duration-200",
                      active ? "text-cream" : "text-cream/75 hover:bg-white/[0.05] hover:text-cream",
                    )}
                  >
                    <Icon
                      aria-hidden
                      strokeWidth={ICON_STROKE}
                      className={cn("size-5 shrink-0 transition-colors", active ? "text-amber" : "text-cream/50 group-hover:text-cream/80")}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    <PendingDot />
                    {count && count.value > 0 && (
                      <span
                        className={cn(
                          "flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums",
                          count.urgent ? "bg-rust text-cream" : "bg-white/10 text-cream",
                        )}
                      >
                        {count.value > 99 ? "99+" : count.value}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function SidebarBody({
  section,
  counts,
  footer,
  onNavigate,
}: {
  section: NavSection;
  counts: NavCounts;
  footer: ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] bg-night text-cream">
      <div className="px-6 pb-1 pt-6">
        <Logo tone="light" href={section === "admin" ? "/admin" : "/dashboard"} />
      </div>
      <div className="px-4 pt-5">
        {section === "admin" ? (
          <div className="flex h-12 items-center gap-2.5 rounded-2xl bg-linear-to-r from-crimson to-rust px-4 text-[15px] font-bold text-cream">
            <ShieldCheck aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
            Administrator
          </div>
        ) : (
          <Link
            href="/reports/new"
            onClick={onNavigate}
            className="flex h-12 items-center gap-2.5 rounded-2xl bg-linear-to-r from-crimson to-rust px-4 text-[15px] font-bold text-cream transition-[filter,transform] hover:brightness-110 active:scale-[0.98]"
          >
            <Plus aria-hidden strokeWidth={2.5} className="size-5" />
            Report an item
          </Link>
        )}
      </div>
      <nav aria-label="Main" className="mt-6 flex-1 overflow-y-auto px-3 pb-4">
        <NavGroups section={section} counts={counts} onNavigate={onNavigate} />
      </nav>
      <div className="px-3 pb-4">{footer}</div>
    </div>
  );
}

export function Sidebar(props: { section: NavSection; counts: NavCounts; footer: ReactNode }) {
  return (
    <aside className="fixed inset-y-3 left-3 z-30 hidden w-[264px] lg:block">
      <SidebarBody {...props} />
    </aside>
  );
}

export function MobileNav(props: { section: NavSection; counts: NavCounts; footer: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close when the route changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label="Menu"
        onClick={() => setOpen(true)}
        className="flex size-10 items-center justify-center rounded-xl text-ink hover:bg-sand"
      >
        <Menu aria-hidden strokeWidth={ICON_STROKE} className="size-[22px]" />
      </button>
      <div
        className={cn(
          "fixed inset-0 z-50 transition-[visibility] duration-300",
          open ? "visible" : "invisible",
        )}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={cn("absolute inset-0 bg-ink/50 transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
        />
        <div
          id="mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={cn(
            "absolute inset-y-3 left-3 w-[min(290px,84vw)] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
            open ? "translate-x-0" : "-translate-x-[calc(100%+1rem)]",
          )}
        >
          <SidebarBody {...props} onNavigate={() => setOpen(false)} />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="absolute right-3 top-4 flex size-10 items-center justify-center rounded-xl text-cream/80 hover:bg-white/10 hover:text-cream"
          >
            <X aria-hidden strokeWidth={ICON_STROKE} className="size-[22px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
