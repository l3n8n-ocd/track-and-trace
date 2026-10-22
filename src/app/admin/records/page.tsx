import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, gte, lt, lte, or, type SQL } from "drizzle-orm";
import { Flash } from "@/components/flash";
import { ReportStatusBadge } from "@/components/status-badge";
import { Button, Card, Field, Input, PageHeader, buttonClass } from "@/components/ui";
import { db, schema } from "@/db";
import { daysAgo, formatDate, formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { locationLabel } from "@/server/options";
import { storageLocation } from "@/server/queries";
import { containsCI } from "@/server/sql";

export const metadata: Metadata = { title: "Records" };

export default async function RecordsPage({ searchParams }: PageProps<"/admin/records">) {
  await requireAdmin();
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const q = s("q").slice(0, 100);
  const from = /^\d{4}-\d{2}-\d{2}$/.test(s("from")) ? s("from") : "";
  const to = /^\d{4}-\d{2}-\d{2}$/.test(s("to")) ? s("to") : "";

  const logFilters: (SQL | undefined)[] = [
    q ? or(containsCI(schema.activityLog.action, q), containsCI(schema.user.name, q), containsCI(schema.activityLog.targetEntity, q)) : undefined,
    from ? gte(schema.activityLog.dateLogged, new Date(`${from}T00:00:00+08:00`)) : undefined,
    to ? lte(schema.activityLog.dateLogged, new Date(`${to}T23:59:59+08:00`)) : undefined,
  ];
  const fiftyDaysAgo = daysAgo(50);

  const [logs, expired, aging] = await Promise.all([
    db
      .select({ log: schema.activityLog, name: schema.user.name })
      .from(schema.activityLog)
      .leftJoin(schema.user, eq(schema.user.id, schema.activityLog.userId))
      .where(and(...logFilters))
      .orderBy(desc(schema.activityLog.dateLogged))
      .limit(200),
    db
      .select({ report: schema.report, storage: storageLocation })
      .from(schema.report)
      .leftJoin(storageLocation, eq(storageLocation.id, schema.report.storageLocationId))
      .where(and(eq(schema.report.reportType, "FOUND"), eq(schema.report.status, "EXPIRED")))
      .orderBy(desc(schema.report.updatedAt)),
    db
      .select({ report: schema.report, storage: storageLocation })
      .from(schema.report)
      .leftJoin(storageLocation, eq(storageLocation.id, schema.report.storageLocationId))
      .where(
        and(
          eq(schema.report.reportType, "FOUND"),
          eq(schema.report.status, "VERIFIED"),
          lt(schema.report.dateVerified, fiftyDaysAgo),
        ),
      )
      .orderBy(schema.report.dateVerified),
  ]);

  const exportQs = new URLSearchParams({ ...(from && { from }), ...(to && { to }) }).toString();

  return (
    <div className="space-y-6">
      <PageHeader title="Records" description="Exports, unclaimed items, and the activity log." />
      <Flash sp={sp} />

      <Card>
        <h2 className="font-semibold">Export records (CSV)</h2>
        <p className="mt-1 text-sm text-slate-600">Uses the date range in the activity log filter below, if set.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["reports", "Reports"],
            ["claims", "Claims"],
            ["activity", "Activity log"],
          ].map(([type, label]) => (
            <a key={type} href={`/api/admin/export?type=${type}${exportQs ? `&${exportQs}` : ""}`} className={buttonClass("secondary", "sm")}>
              Download {label}
            </a>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Expired and unclaimed items</h2>
        <p className="mt-1 text-sm text-slate-600">
          Found items are marked expired after 60 days in storage without an approved claim. Dispose of them according to
          university policy, then archive the report.
        </p>
        <h3 className="mt-4 text-sm font-medium">Expired ({expired.length})</h3>
        <ItemList rows={expired} />
        <h3 className="mt-4 text-sm font-medium">In storage over 50 days ({aging.length})</h3>
        <ItemList rows={aging} />
      </Card>

      <Card>
        <h2 className="font-semibold">Activity log</h2>
        <form className="mt-3 grid gap-3 sm:grid-cols-4">
          <Field label="Search" htmlFor="q" className="sm:col-span-2">
            <Input id="q" name="q" defaultValue={q} placeholder="Action, person, or record type" />
          </Field>
          <Field label="From" htmlFor="from">
            <Input id="from" name="from" type="date" defaultValue={from} />
          </Field>
          <Field label="To" htmlFor="to">
            <Input id="to" name="to" type="date" defaultValue={to} />
          </Field>
          <div className="sm:col-span-4">
            <Button type="submit" size="sm">
              Filter
            </Button>
          </div>
        </form>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-4">When</th>
                <th className="py-2 pr-4">Who</th>
                <th className="py-2 pr-4">Action</th>
                <th className="py-2 pr-4">Record</th>
                <th className="py-2">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map(({ log, name }) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap py-2 pr-4 text-slate-500">{formatDateTime(log.dateLogged)}</td>
                  <td className="py-2 pr-4">{name ?? "System"}</td>
                  <td className="py-2 pr-4">{log.action}</td>
                  <td className="whitespace-nowrap py-2 pr-4">
                    {log.targetEntity === "report" || log.targetEntity === "claim" ? (
                      <Link href={`/admin/${log.targetEntity}s/${log.targetId}`} className="text-brand-700 hover:underline">
                        {log.targetEntity} #{log.targetId}
                      </Link>
                    ) : (
                      `${log.targetEntity} ${log.targetId.length > 12 ? "" : `#${log.targetId}`}`
                    )}
                  </td>
                  <td className="py-2 text-slate-600">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ItemList({
  rows,
}: {
  rows: { report: typeof schema.report.$inferSelect; storage: typeof schema.location.$inferSelect | null }[];
}) {
  if (!rows.length) return <p className="mt-1 text-sm text-slate-500">None.</p>;
  return (
    <ul className="mt-2 divide-y divide-slate-100 text-sm">
      {rows.map(({ report: r, storage }) => (
        <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <Link href={`/admin/reports/${r.id}`} className="text-brand-700 hover:underline">
            #{r.id} {r.itemName}
          </Link>
          <span className="flex items-center gap-2 text-xs text-slate-500">
            {storage ? locationLabel(storage) : "No storage"} · verified {formatDate(r.dateVerified)}
            <ReportStatusBadge status={r.status} />
          </span>
        </li>
      ))}
    </ul>
  );
}
