import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, inArray, lt, type SQL } from "drizzle-orm";
import { Card, PageHeader } from "@/components/ui";
import { db, schema } from "@/db";
import { daysAgo, formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Admin overview" };

export default async function AdminHome() {
  await requireAdmin();
  const nearExpiry = daysAgo(50);
  const c = (where: SQL | undefined, table: typeof schema.report | typeof schema.claim = schema.report) =>
    db.select({ value: count() }).from(table).where(where).then((r) => r[0].value);

  const [pendingReports, pendingClaims, inStorage, awaitingPickup, expiringSoon, users, activity] = await Promise.all([
    c(eq(schema.report.status, "PENDING")),
    c(inArray(schema.claim.claimStatus, ["PENDING", "MORE_INFO_NEEDED"]), schema.claim),
    c(and(eq(schema.report.reportType, "FOUND"), eq(schema.report.status, "VERIFIED"))),
    c(eq(schema.claim.claimStatus, "APPROVED"), schema.claim),
    c(
      and(
        eq(schema.report.reportType, "FOUND"),
        eq(schema.report.status, "VERIFIED"),
        lt(schema.report.dateVerified, nearExpiry),
      ),
    ),
    db.select({ value: count() }).from(schema.user).then((r) => r[0].value),
    db
      .select({ log: schema.activityLog, name: schema.user.name })
      .from(schema.activityLog)
      .leftJoin(schema.user, eq(schema.user.id, schema.activityLog.userId))
      .orderBy(desc(schema.activityLog.dateLogged))
      .limit(8),
  ]);

  const tiles = [
    { label: "Reports to verify", value: pendingReports, href: "/admin/reports?status=PENDING", urgent: pendingReports > 0 },
    { label: "Claims to review", value: pendingClaims, href: "/admin/claims", urgent: pendingClaims > 0 },
    { label: "Approved, awaiting pickup", value: awaitingPickup, href: "/admin/claims?status=APPROVED" },
    { label: "Items in storage", value: inStorage, href: "/admin/reports?type=FOUND&status=VERIFIED" },
    { label: "In storage over 50 days", value: expiringSoon, href: "/admin/records" },
    { label: "Registered users", value: users, href: "/admin/users" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description="Today's work for the Lost and Found Office." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={`rounded-lg bg-white p-5 shadow-sm ring-1 hover:ring-brand-200 ${t.urgent ? "ring-amber-300" : "ring-slate-200"}`}
          >
            <p className="text-sm text-slate-600">{t.label}</p>
            <p className="mt-1 text-3xl font-semibold">{t.value}</p>
          </Link>
        ))}
      </div>
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Recent activity</h2>
          <Link href="/admin/records" className="text-sm text-brand-700 hover:underline">
            Full log
          </Link>
        </div>
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {activity.map(({ log, name }) => (
            <li key={log.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span>
                <span className="font-medium">{name ?? "System"}</span> · {log.action} ({log.targetEntity} #{log.targetId})
              </span>
              <span className="text-xs text-slate-500">{formatDateTime(log.dateLogged)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
