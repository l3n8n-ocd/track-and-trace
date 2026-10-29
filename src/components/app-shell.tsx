import Link from "next/link";
import { and, count, eq } from "drizzle-orm";
import { logoutAction } from "@/app/(auth)/actions";
import { db, schema } from "@/db";
import type { SessionUser } from "@/lib/session";
import { Logo } from "./logo";
import { MobileMenu, NavLinks, type NavItem } from "./nav-links";

const USER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/search", label: "Search items" },
  { href: "/reports", label: "My reports" },
  { href: "/matches", label: "Matches" },
  { href: "/claims", label: "My claims" },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/claims", label: "Claims" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/records", label: "Records" },
  { href: "/admin/settings", label: "Settings" },
];

export async function AppShell({
  user,
  section,
  children,
}: {
  user: SessionUser;
  section: "user" | "admin";
  children: React.ReactNode;
}) {
  const [{ value: unread }] = await db
    .select({ value: count() })
    .from(schema.notification)
    .where(and(eq(schema.notification.userId, user.id), eq(schema.notification.isRead, false)));

  const items = section === "admin" ? ADMIN_NAV : USER_NAV;
  const switchLink =
    user.role === "admin"
      ? section === "admin"
        ? { href: "/dashboard", label: "User view" }
        : { href: "/admin", label: "Admin panel" }
      : null;

  const accountLinks = (
    <div className="flex flex-col gap-1 border-t border-slate-200 pt-3 text-sm">
      {switchLink && (
        <Link href={switchLink.href} className="rounded-md px-3 py-2 font-medium text-brand-700">
          {switchLink.label}
        </Link>
      )}
      <Link href="/profile" className="rounded-md px-3 py-2 text-slate-700">
        Profile
      </Link>
      <form action={logoutAction}>
        <button className="w-full rounded-md px-3 py-2 text-left text-slate-700">Log out</button>
      </form>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="relative mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Logo href={section === "admin" ? "/admin" : "/dashboard"} compact={section === "admin"} />
            {section === "admin" && (
              <span className="hidden rounded bg-gold-400 px-2 py-0.5 text-xs font-semibold text-slate-900 sm:inline">
                ADMIN
              </span>
            )}
            <NavLinks items={items} />
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/notifications"
              className="relative rounded-md p-2 text-slate-700 hover:bg-slate-100"
              aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-brand-600 px-1 text-center text-[11px] font-semibold leading-5 text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
            <div className="hidden items-center gap-1 whitespace-nowrap xl:flex">
              {switchLink && (
                <Link href={switchLink.href} className="rounded-md px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50">
                  {switchLink.label}
                </Link>
              )}
              <Link href="/profile" className="rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                {user.firstName}
              </Link>
              <form action={logoutAction}>
                <button className="rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">Log out</button>
              </form>
            </div>
            <MobileMenu items={items} footer={accountLinks} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{children}</main>
    </>
  );
}
