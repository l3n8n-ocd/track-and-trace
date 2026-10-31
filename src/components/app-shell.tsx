import Link from "next/link";
import { and, count, eq } from "drizzle-orm";
import { ArrowLeftRight, Bell, LogOut, Search } from "lucide-react";
import { db, schema } from "@/db";
import type { SessionUser } from "@/lib/session";
import { adminClaimCounts, pendingMatchCount, pendingReportCount } from "@/server/counts";
import { Logo } from "./logo";
import { LogoutButton } from "./logout-button";
import { MobileNav, Sidebar, type NavCounts } from "./nav-links";
import { Avatar, ICON_STROKE, cn } from "./ui";

const ROLE_LABEL = { student: "Student", faculty: "Faculty", staff: "Staff", admin: "Administrator" } as const;

async function navCounts(user: SessionUser, section: "user" | "admin"): Promise<NavCounts> {
  if (section === "admin") {
    const [reports, claims] = await Promise.all([pendingReportCount(), adminClaimCounts()]);
    return {
      "/admin/reports": { value: reports, urgent: true },
      "/admin/claims": { value: claims.pending, urgent: true },
    };
  }
  const matches = await pendingMatchCount(user.id);
  return {
    "/matches": { value: matches.value, urgent: true },
  };
}

export async function AppShell({
  user,
  section,
  children,
}: {
  user: SessionUser;
  section: "user" | "admin";
  children: React.ReactNode;
}) {
  const [[{ value: unread }], counts] = await Promise.all([
    db.select({ value: count() }).from(schema.notification)
      .where(and(eq(schema.notification.userId, user.id), eq(schema.notification.isRead, false))),
    navCounts(user, section),
  ]);
  if (section === "user") counts["/notifications"] = { value: unread };

  const switchLink =
    user.role === "admin"
      ? section === "admin"
        ? { href: "/dashboard", label: "Switch to user view" }
        : { href: "/admin", label: "Switch to admin console" }
      : null;
  const fullName = `${user.firstName} ${user.lastName ?? ""}`.trim();

  const row = "flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-[15px] font-medium transition-colors";
  const accountCard = (
    <div className="space-y-1 border-t border-white/10 pt-3">
      {switchLink && (
        <Link href={switchLink.href} className={cn(row, "text-cream/75 hover:bg-white/[0.05] hover:text-cream")}>
          <ArrowLeftRight aria-hidden strokeWidth={ICON_STROKE} className="size-5 text-cream/50" />
          {switchLink.label}
        </Link>
      )}
      <Link href="/profile" className={cn(row, "h-14 text-cream hover:bg-white/[0.05]")}>
        <Avatar name={fullName} className="size-8 bg-cream text-[11px] text-oxblood ring-0" />
        <span className="min-w-0 text-left">
          <span className="block truncate text-sm font-semibold">{fullName}</span>
          <span className="block truncate text-xs text-cream/55">{ROLE_LABEL[user.role]} · View profile</span>
        </span>
      </Link>
      <LogoutButton className={cn(row, "text-amber hover:bg-white/[0.05]")}>
        <LogOut aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
        Log out
      </LogoutButton>
      <p className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cream/35">Track · Match · Return</p>
    </div>
  );

  return (
    <>
      <Sidebar section={section} counts={counts} footer={accountCard} />
      <div className="flex min-h-full flex-1 flex-col lg:pl-[280px]">
        <header className="sticky top-0 z-20 border-b border-line bg-cream">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
            <div className="flex items-center gap-2 lg:hidden">
              <MobileNav section={section} counts={counts} footer={accountCard} />
              <Logo href={section === "admin" ? "/admin" : "/dashboard"} className="[&_span]:text-[15px]" />
            </div>
            <p className="hidden text-sm text-ink-muted lg:block">
              {section === "admin" ? (
                <>
                  <span className="font-semibold text-ink">Admin console</span> · Bulacan State University – Main Campus
                </>
              ) : (
                <>
                  <span className="font-semibold text-ink">Lost and Found</span> · Bulacan State University – Main Campus
                </>
              )}
            </p>
            <div className="flex items-center gap-1.5">
              {section === "user" && (
                <Link
                  href="/search"
                  className="hidden h-10 items-center gap-2 rounded-xl border border-line bg-paper pl-3 pr-4 text-sm text-ink-muted hover:border-line-strong hover:text-ink sm:flex"
                >
                  <Search aria-hidden strokeWidth={ICON_STROKE} className="size-[18px]" />
                  Search found items
                </Link>
              )}
              <Link
                href="/notifications"
                className="relative flex size-10 items-center justify-center rounded-xl text-ink hover:bg-sand"
                aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
              >
                <Bell aria-hidden strokeWidth={ICON_STROKE} className="size-[21px]" />
                {unread > 0 && (
                  <span className="absolute right-0.5 top-0.5 min-w-5 rounded-full bg-crimson px-1 text-center text-[11px] font-bold leading-5 text-cream ring-2 ring-cream">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
              <Link href="/profile" aria-label="Profile" className="rounded-full p-0.5 hover:ring-2 hover:ring-line-strong">
                <Avatar name={fullName} />
              </Link>
            </div>
          </div>
        </header>
        <main className={cn("mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10")}>{children}</main>
      </div>
    </>
  );
}
