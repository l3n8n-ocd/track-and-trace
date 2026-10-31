import type { Metadata } from "next";
import Link from "next/link";
import { asc, count, desc, eq } from "drizzle-orm";
import {
  Activity,
  ArrowRight,
  CircleCheckBig,
  Hourglass,
  Inbox,
  PackageOpen,
  TimerOff,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { Banner, BannerStat } from "@/components/banner";
import { REPORT_TAG, TypeBadge } from "@/components/status-badge";
import { Card, CardHeader, ICON_STROKE, LinkButton, cn } from "@/components/ui";
import { db, schema } from "@/db";
import { REPORT_STATUSES, type ReportStatus } from "@/db/schema";
import { daysSince, formatDate, formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { REPORT_STATUS_LABEL } from "@/lib/status";
import { ActivityIcon } from "./activity-icon";
import { adminClaimCounts, adminReportBreakdown, pendingReportCount } from "@/server/counts";

export const metadata: Metadata = { title: "Admin overview" };

// Bar colors for the status breakdown, matching the status tags.
const STATUS_BAR: Record<ReportStatus, string> = {
  PENDING: "bg-rust",
  VERIFIED: "bg-crimson",
  CLAIMED: "bg-oxblood",
  CLOSED: "bg-ink-faint",
  EXPIRED: "bg-berry/50",
  ARCHIVED: "bg-line-strong",
};

function since(d: Date) {
  const days = daysSince(d);
  return days === 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;
}

export default async function AdminHome() {
  const admin = await requireAdmin();
  const [pendingReports, claimCounts, users, activity, queueReports, queueClaims, breakdown] =
    await Promise.all([
      pendingReportCount(),
      adminClaimCounts(),
      db.select({ value: count() }).from(schema.user).then((r) => r[0].value),
      db
        .select({ log: schema.activityLog, name: schema.user.name })
        .from(schema.activityLog)
        .leftJoin(schema.user, eq(schema.user.id, schema.activityLog.userId))
        .orderBy(desc(schema.activityLog.dateLogged))
        .limit(8),
      db
        .select({
          id: schema.report.id,
          type: schema.report.reportType,
          itemName: schema.report.itemName,
          reported: schema.report.dateReported,
          reporter: schema.user.name,
        })
        .from(schema.report)
        .innerJoin(schema.user, eq(schema.user.id, schema.report.userId))
        .where(eq(schema.report.status, "PENDING"))
        .orderBy(asc(schema.report.dateReported))
        .limit(5),
      db
        .select({ id: schema.claim.id, filed: schema.claim.claimDate, itemName: schema.report.itemName, claimant: schema.user.name })
        .from(schema.claim)
        .innerJoin(schema.report, eq(schema.report.id, schema.claim.reportId))
        .innerJoin(schema.user, eq(schema.user.id, schema.claim.claimantId))
        .where(eq(schema.claim.claimStatus, "PENDING"))
        .orderBy(asc(schema.claim.claimDate))
        .limit(5),
      adminReportBreakdown(),
    ]);
  const pendingClaims = claimCounts.pending;
  const awaitingPickup = claimCounts.approved;
  const stored = breakdown.find((r) => r.type === "FOUND" && r.status === "VERIFIED");
  const inStorage = stored?.value ?? 0;
  const expiringSoon = stored?.expiring ?? 0;

  const tiles: { label: string; value: number; href: string; icon: LucideIcon; hint: string; warn?: boolean }[] = [
    { label: "Approved, awaiting pickup", value: awaitingPickup, href: "/admin/claims?status=APPROVED", icon: PackageOpen, hint: "Check a valid ID on release" },
    { label: "Items in storage", value: inStorage, href: "/admin/reports?type=FOUND&status=VERIFIED", icon: Warehouse, hint: "Verified and claimable" },
    { label: "In storage over 50 days", value: expiringSoon, href: "/admin/records", icon: TimerOff, hint: "Expire at 60 days", warn: expiringSoon > 0 },
    { label: "Registered users", value: users, href: "/admin/users", icon: Users, hint: "Students, faculty, staff" },
  ];

  const byType = (t: "LOST" | "FOUND") => {
    const rows = REPORT_STATUSES.map((s) => ({
      status: s,
      value: breakdown.find((b) => b.type === t && b.status === s)?.value ?? 0,
    }));
    return { rows, total: rows.reduce((n, r) => n + r.value, 0) };
  };

  const hour = Number(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila", hour: "numeric", hour12: false }));
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const waiting = pendingReports + pendingClaims;

  return (
    <div className="space-y-6">
      <Banner
        eyebrow={`Lost and Found Office · ${new Date().toLocaleDateString("en-PH", { timeZone: "Asia/Manila", weekday: "long", month: "long", day: "numeric" })}`}
        title={`${hello}, ${admin.firstName}.`}
        actions={
          <>
            <LinkButton href="/admin/reports?status=PENDING" variant="light" size="lg">
              <Hourglass aria-hidden />
              Verify reports
            </LinkButton>
            <LinkButton href="/admin/claims" size="lg" className="bg-white/10 ring-1 ring-inset ring-cream/30 hover:bg-white/20">
              <Inbox aria-hidden />
              Review claims
            </LinkButton>
          </>
        }
        aside={
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            <BannerStat value={pendingReports} label="Reports to verify" href="/admin/reports?status=PENDING" />
            <BannerStat value={pendingClaims} label="Claims to review" href="/admin/claims" />
          </div>
        }
      >
        {waiting > 0
          ? `${waiting} item${waiting === 1 ? " is" : "s are"} waiting on the office today. Oldest first below.`
          : "Nothing is waiting on the office right now."}
      </Banner>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map(({ label, value, href, icon: Icon, hint, warn }) => (
          <Link
            key={label}
            href={href}
            className={cn(
              "group rounded-2xl border bg-paper p-4 transition-colors hover:bg-white",
              "border-line hover:border-line-strong",
            )}
          >
            <div className="flex items-center justify-between">
              <span className={cn("flex size-9 items-center justify-center rounded-xl", warn ? "bg-rust text-cream" : "bg-sand text-crimson")}>
                <Icon aria-hidden strokeWidth={ICON_STROKE} className="size-[18px]" />
              </span>
              <ArrowRight aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
            </div>
            <p className="mt-3 font-display text-3xl font-bold tabular-nums text-ink">{value}</p>
            <p className="mt-0.5 text-sm font-semibold text-ink">{label}</p>
            <p className={cn("text-xs", warn ? "font-semibold text-rust" : "text-ink-muted")}>{hint}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            icon={Hourglass}
            title="Waiting for verification"
            description="Oldest first"
            action={
              <Link href="/admin/reports?status=PENDING" className="text-sm font-semibold text-crimson hover:underline">
                All {pendingReports}
              </Link>
            }
          />
          {queueReports.length === 0 ? (
            <QueueEmpty text="Every report is verified." />
          ) : (
            <ul className="-mx-2 divide-y divide-line">
              {queueReports.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/reports/${r.id}`} className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-sand/60">
                    <TypeBadge type={r.type} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{r.itemName}</p>
                      <p className="truncate text-xs text-ink-muted">
                        #{r.id} · {r.reporter}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-rust">{since(r.reported)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            icon={Inbox}
            title="Claims to review"
            description="Oldest first"
            action={
              <Link href="/admin/claims" className="text-sm font-semibold text-crimson hover:underline">
                Open queue
              </Link>
            }
          />
          {queueClaims.length === 0 ? (
            <QueueEmpty text="No claims are waiting for review." />
          ) : (
            <ul className="-mx-2 divide-y divide-line">
              {queueClaims.map((cl) => (
                <li key={cl.id}>
                  <Link href={`/admin/claims/${cl.id}`} className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-sand/60">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rust-tint font-display text-xs font-bold text-rust">
                      #{cl.id}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{cl.itemName}</p>
                      <p className="truncate text-xs text-ink-muted">by {cl.claimant}</p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-rust">{since(cl.filed)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader icon={Warehouse} title="Reports by status" description="Everything on record" />
          <div className="space-y-6">
            {(["FOUND", "LOST"] as const).map((t) => {
              const { rows, total } = byType(t);
              return (
                <div key={t}>
                  <div className="mb-2 flex items-center justify-between">
                    <TypeBadge type={t} />
                    <span className="text-sm font-semibold tabular-nums text-ink">{total} total</span>
                  </div>
                  <div className="flex h-3 overflow-hidden rounded-full bg-sand">
                    {rows
                      .filter((r) => r.value > 0)
                      .map((r) => (
                        <span
                          key={r.status}
                          className={cn("h-full border-r-2 border-paper last:border-r-0", STATUS_BAR[r.status])}
                          style={{ width: `${(r.value / total) * 100}%` }}
                          title={`${REPORT_STATUS_LABEL[r.status]}: ${r.value}`}
                        />
                      ))}
                  </div>
                  <ul className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
                    {rows.map((r) => {
                      const Icon = REPORT_TAG[r.status].icon;
                      return (
                        <li key={r.status}>
                          <Link
                            href={`/admin/reports?type=${t}&status=${r.status}`}
                            className={cn("flex items-center gap-1.5 hover:text-ink", r.value ? "text-ink-soft" : "text-ink-faint")}
                          >
                            <span className={cn("size-2 rounded-full", STATUS_BAR[r.status])} />
                            <Icon aria-hidden strokeWidth={2} className="size-3.5" />
                            {REPORT_STATUS_LABEL[r.status]}
                            <span className="ml-auto font-semibold tabular-nums">{r.value}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader
            icon={Activity}
            title="Recent activity"
            action={
              <Link href="/admin/records" className="text-sm font-semibold text-crimson hover:underline">
                Full log
              </Link>
            }
          />
          <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-4 before:top-2 before:w-px before:bg-line">
            {activity.map(({ log, name }) => (
              <li key={log.id} className="relative flex items-start gap-3">
                <ActivityIcon action={log.action} entity={log.targetEntity} className="ring-4 ring-paper" />
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm text-ink">
                    <span className="font-semibold">{name ?? "System"}</span> · {log.action}{" "}
                    {log.targetEntity === "report" || log.targetEntity === "claim" ? (
                      <Link href={`/admin/${log.targetEntity}s/${log.targetId}`} className="font-medium text-crimson hover:underline">
                        {log.targetEntity} #{log.targetId}
                      </Link>
                    ) : (
                      <span className="text-ink-muted">({log.targetEntity})</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">{formatDateTime(log.dateLogged)}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
      <p className="text-center text-xs text-ink-muted">Figures as of {formatDate(new Date())}.</p>
    </div>
  );
}

function QueueEmpty({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 rounded-xl bg-cream/70 px-4 py-3.5 text-sm text-ink-muted">
      <CircleCheckBig aria-hidden strokeWidth={ICON_STROKE} className="size-[18px] text-crimson" />
      {text}
    </p>
  );
}
