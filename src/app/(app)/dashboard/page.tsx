import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import {
  ArrowRight,
  Bell,
  BellRing,
  FileQuestion,
  FileText,
  Megaphone,
  PackageOpen,
  ScanSearch,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Banner, BannerStat } from "@/components/banner";
import { ClaimStatusBadge, ReportStatusBadge, StageMeter, TypeBadge } from "@/components/status-badge";
import { Card, CardEmpty, CardHeader, ICON_STROKE, LinkButton, Notice, cn } from "@/components/ui";
import { db, schema } from "@/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { claimJourney, journeyProgress, reportJourney } from "@/lib/journey";
import { requireUser } from "@/lib/session";
import { ACTIVE_CLAIM_STATUSES, OPEN_REPORT_STATUSES } from "@/lib/status";
import { matchedLostIds } from "@/server/queries";
import { pendingMatchCount } from "@/server/counts";

export const metadata: Metadata = { title: "Dashboard" };

function greeting() {
  const hour = Number(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila", hour: "numeric", hour12: false }));
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage() {
  const user = await requireUser();

  const [[openReports], matches, [claims], announcements, notifications, activeClaims, recentReports] = await Promise.all([
    db
      .select({ value: count() })
      .from(schema.report)
      .where(and(eq(schema.report.userId, user.id), inArray(schema.report.status, OPEN_REPORT_STATUSES))),
    pendingMatchCount(user.id),
    db
      .select({ value: count() })
      .from(schema.claim)
      .where(and(eq(schema.claim.claimantId, user.id), inArray(schema.claim.claimStatus, ACTIVE_CLAIM_STATUSES))),
    db.query.announcement.findMany({
      where: eq(schema.announcement.isActive, true),
      orderBy: desc(schema.announcement.datePosted),
      limit: 3,
    }),
    db.query.notification.findMany({
      where: eq(schema.notification.userId, user.id),
      orderBy: desc(schema.notification.dateSent),
      limit: 5,
    }),
    db
      .select({ claim: schema.claim, itemName: schema.report.itemName })
      .from(schema.claim)
      .innerJoin(schema.report, eq(schema.report.id, schema.claim.reportId))
      .where(and(eq(schema.claim.claimantId, user.id), inArray(schema.claim.claimStatus, ACTIVE_CLAIM_STATUSES)))
      .orderBy(desc(schema.claim.claimDate))
      .limit(4),
    db
      .select()
      .from(schema.report)
      .where(eq(schema.report.userId, user.id))
      .orderBy(desc(schema.report.dateReported))
      .limit(4),
  ]);
  const matched = await matchedLostIds(recentReports.filter((r) => r.reportType === "LOST").map((r) => r.id));

  // Things that need the user's own action, most urgent first.
  const todo = [
    ...activeClaims
      .filter(({ claim }) => claim.claimStatus === "APPROVED")
      .map(({ claim, itemName }) => ({
        key: `c${claim.id}`,
        icon: PackageOpen,
        title: `Pick up your ${itemName}`,
        body: `Bring a valid ID to the Lost and Found Office by ${formatDate(claim.pickupDeadline)}.`,
        href: `/claims/${claim.id}`,
        cta: "View pickup details",
      })),
    ...activeClaims
      .filter(({ claim }) => claim.claimStatus === "MORE_INFO_NEEDED")
      .map(({ claim, itemName }) => ({
        key: `p${claim.id}`,
        icon: FileQuestion,
        title: `More proof needed for ${itemName}`,
        body: "The office asked for more details before approving your claim.",
        href: `/claims/${claim.id}`,
        cta: "Send proof",
      })),
    ...(matches.value > 0
      ? [
          {
            key: "matches",
            icon: ScanSearch,
            title: `${matches.value} possible match${matches.value === 1 ? "" : "es"} for your lost items`,
            body: "Compare them with what you lost, then claim it or mark it as not yours.",
            href: "/matches",
            cta: "Review matches",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <Banner
        eyebrow={new Date().toLocaleDateString("en-PH", { timeZone: "Asia/Manila", weekday: "long", month: "long", day: "numeric" })}
        title={`${greeting()}, ${user.firstName}.`}
        actions={
          <>
            <LinkButton href="/reports/new?type=lost" variant="light" size="lg">
              I lost something
            </LinkButton>
            <LinkButton href="/reports/new?type=found" size="lg" className="bg-white/10 ring-1 ring-inset ring-cream/30 hover:bg-white/20">
              I found something
            </LinkButton>
            <LinkButton href="/search" size="lg" className="bg-transparent hover:bg-white/10">
              <Search aria-hidden />
              Search found items
            </LinkButton>
          </>
        }
        aside={
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            <BannerStat value={openReports.value} label="Open reports" href="/reports" />
            <BannerStat value={matches.value} label="Possible matches" href="/matches" />
            <BannerStat value={claims.value} label="Active claims" href="/claims" />
          </div>
        }
      >
        Lost something, or holding something that isn&apos;t yours? Start here.
      </Banner>

      {todo.length > 0 && (
        <Card>
          <CardHeader icon={BellRing} title="Needs your attention" description="Only you can do these." />
          <ul className="grid gap-3 md:grid-cols-2">
            {todo.map((t) => (
              <li key={t.key}>
                <Link href={t.href} className="group block h-full rounded-2xl">
                  <Notice
                    tone="amber"
                    icon={t.icon}
                    title={t.title}
                    className="h-full transition-colors group-hover:border-amber/60"
                    action={
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-crimson">
                        {t.cta}
                        <ArrowRight aria-hidden strokeWidth={ICON_STROKE} className="size-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    }
                  >
                    {t.body}
                  </Notice>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            icon={ShieldCheck}
            title="Your active claims"
            action={
              <Link href="/claims" className="text-sm font-semibold text-crimson hover:underline">
                All claims
              </Link>
            }
          />
          {activeClaims.length === 0 ? (
            <CardEmpty icon={ShieldCheck}>
              No active claims. When you find your item in search, file a claim and track it here.
            </CardEmpty>
          ) : (
            <ul className="-mx-2 divide-y divide-line">
              {activeClaims.map(({ claim, itemName }) => {
                const p = journeyProgress(claimJourney(claim, "owner"));
                return (
                  <li key={claim.id}>
                    <Link href={`/claims/${claim.id}`} className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-sand/60">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink">{itemName}</p>
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-ink-muted">
                          <StageMeter {...p} label={`Step ${Math.min(p.done + 1, p.total)} of ${p.total}`} />
                          Claim #{claim.id}
                        </div>
                      </div>
                      <ClaimStatusBadge status={claim.claimStatus} size="sm" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            icon={FileText}
            title="Your recent reports"
            action={
              <Link href="/reports" className="text-sm font-semibold text-crimson hover:underline">
                All reports
              </Link>
            }
          />
          {recentReports.length === 0 ? (
            <CardEmpty icon={FileText}>You haven&apos;t reported anything yet. Use the buttons above to start.</CardEmpty>
          ) : (
            <ul className="-mx-2 divide-y divide-line">
              {recentReports.map((r) => {
                const p = journeyProgress(reportJourney(r, { audience: "owner", hasMatch: matched.has(r.id) }));
                return (
                  <li key={r.id}>
                    <Link href={`/reports/${r.id}`} className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-sand/60">
                      <TypeBadge type={r.reportType} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink">{r.itemName}</p>
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-ink-muted">
                          <StageMeter {...p} label={`Step ${Math.min(p.done + 1, p.total)} of ${p.total}`} />
                          {formatDate(r.dateReported)}
                        </div>
                      </div>
                      <ReportStatusBadge status={r.status} size="sm" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            icon={Bell}
            title="Recent notifications"
            action={
              <Link href="/notifications" className="text-sm font-semibold text-crimson hover:underline">
                See all
              </Link>
            }
          />
          {notifications.length === 0 ? (
            <CardEmpty icon={Bell}>Nothing yet. Updates on your reports and claims will appear here.</CardEmpty>
          ) : (
            <ul className="-mx-2 divide-y divide-line">
              {notifications.map((n) => (
                <li key={n.id} className="flex gap-3 px-2 py-3">
                  <span
                    aria-hidden
                    className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.isRead ? "bg-line-strong" : "bg-crimson")}
                  />
                  <div className="min-w-0">
                    <p className={cn("text-sm", n.isRead ? "text-ink-soft" : "font-semibold text-ink")}>{n.message}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">{formatDateTime(n.dateSent)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader icon={Megaphone} title="From the office" />
          {announcements.length === 0 ? (
            <CardEmpty icon={Megaphone}>No announcements right now.</CardEmpty>
          ) : (
            <ul className="space-y-3">
              {announcements.map((a) => (
                <li key={a.id}>
                  <Notice tone="rust" icon={Megaphone} title={a.title} meta={formatDate(a.datePosted)}>
                    <span className="whitespace-pre-line">{a.body}</span>
                  </Notice>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
