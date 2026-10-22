import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { Card, LinkButton, PageHeader } from "@/components/ui";
import { db, schema } from "@/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { ACTIVE_CLAIM_STATUSES, OPEN_REPORT_STATUSES } from "@/lib/status";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();

  const myLost = db
    .select({ id: schema.report.id })
    .from(schema.report)
    .where(and(eq(schema.report.userId, user.id), eq(schema.report.reportType, "LOST")));

  const [[openReports], [matches], [claims], announcements, notifications] = await Promise.all([
    db
      .select({ value: count() })
      .from(schema.report)
      .where(and(eq(schema.report.userId, user.id), inArray(schema.report.status, OPEN_REPORT_STATUSES))),
    db
      .select({ value: count() })
      .from(schema.matchRecord)
      .where(
        and(
          eq(schema.matchRecord.matchStatus, "PENDING_VERIFICATION"),
          inArray(schema.matchRecord.lostReportId, myLost),
        ),
      ),
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
  ]);

  const stats = [
    { label: "Open reports", value: openReports.value, href: "/reports" },
    { label: "Possible matches", value: matches.value, href: "/matches" },
    { label: "Active claims", value: claims.value, href: "/claims" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hi, ${user.firstName}`}
        description="What would you like to do?"
        actions={
          <>
            <LinkButton href="/reports/new?type=lost">I lost something</LinkButton>
            <LinkButton href="/reports/new?type=found" variant="secondary">
              I found something
            </LinkButton>
            <LinkButton href="/search" variant="secondary">
              Search found items
            </LinkButton>
          </>
        }
      />

      {announcements.length > 0 && (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
              <p className="font-semibold">📢 {a.title}</p>
              <p className="mt-1 whitespace-pre-line">{a.body}</p>
              <p className="mt-1 text-xs text-amber-700">{formatDate(a.datePosted)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200 hover:ring-brand-200">
            <p className="text-sm text-slate-600">{s.label}</p>
            <p className="mt-1 text-3xl font-semibold">{s.value}</p>
          </Link>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Recent notifications</h2>
          <Link href="/notifications" className="text-sm text-brand-700 hover:underline">
            See all
          </Link>
        </div>
        {notifications.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">Nothing yet. Updates on your reports and claims will appear here.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {notifications.map((n) => (
              <li key={n.id} className="py-2.5 text-sm">
                <p className={n.isRead ? "text-slate-600" : "font-medium text-slate-900"}>{n.message}</p>
                <p className="text-xs text-slate-500">{formatDateTime(n.dateSent)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
