import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, gte, lt, lte, or, type SQL } from "drizzle-orm";
import { Activity, Download, FileText, FolderArchive, Inbox, ListFilter, Search, TimerOff } from "lucide-react";
import { Flash } from "@/components/flash";
import { ReportStatusBadge } from "@/components/status-badge";
import { Button, Card, CardHeader, Field, ICON_STROKE, Input, PageHeader } from "@/components/ui";
import { db, schema } from "@/db";
import { daysAgo, formatDate, formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { locationLabel } from "@/server/options";
import { storageLocation } from "@/server/queries";
import { ActivityIcon } from "../activity-icon";
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
      <PageHeader icon={FolderArchive} title="Records" description="Exports, unclaimed items, and the activity log." />
      <Flash sp={sp} />

      <section aria-labelledby="export-heading">
        <h2 id="export-heading" className="mb-1 text-sm font-semibold uppercase tracking-wider text-ink-muted">
          Export records (CSV)
        </h2>
        <p className="mb-3 text-sm text-ink-muted">
          {from || to
            ? `Limited to the activity log date range below (${from || "start"} to ${to || "today"}).`
            : "Uses the date range in the activity log filter below, if set."}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["reports", "Reports", "Every lost and found report", FileText],
              ["claims", "Claims", "Claims and their decisions", Inbox],
              ["activity", "Activity log", "Who did what, and when", Activity],
            ] as const
          ).map(([type, label, hint, Icon]) => (
            <a
              key={type}
              href={`/api/admin/export?type=${type}${exportQs ? `&${exportQs}` : ""}`}
              className="group flex items-center gap-3 rounded-2xl border border-line bg-paper p-4 transition-colors hover:border-line-strong hover:bg-white"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-sand text-crimson">
                <Icon aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">Download {label}</span>
                <span className="block text-xs text-ink-muted">{hint}</span>
              </span>
              <Download aria-hidden strokeWidth={ICON_STROKE} className="size-5 text-ink-faint group-hover:text-crimson" />
            </a>
          ))}
        </div>
      </section>

      <Card>
        <CardHeader
          icon={TimerOff}
          title="Expired and unclaimed items"
          description="Found items expire after 60 days in storage without an approved claim. Dispose of them according to university policy, then archive the report."
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
              <span className="size-2 rounded-full bg-berry" />
              Expired ({expired.length})
            </h3>
            <ItemList rows={expired} empty="No expired items." />
          </div>
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
              <span className="size-2 rounded-full bg-rust" />
              In storage over 50 days ({aging.length})
            </h3>
            <ItemList rows={aging} empty="Nothing close to expiring." />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader icon={Activity} title="Activity log" description={`${logs.length} entries${logs.length === 200 ? " (latest 200)" : ""}`} />
        <form className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto] lg:items-end">
          <Field label="Search" htmlFor="q" className="sm:col-span-2 lg:col-span-1">
            <Input id="q" name="q" icon={Search} defaultValue={q} placeholder="Action, person, or record type" />
          </Field>
          <Field label="From" htmlFor="from">
            <Input id="from" name="from" type="date" defaultValue={from} />
          </Field>
          <Field label="To" htmlFor="to">
            <Input id="to" name="to" type="date" defaultValue={to} />
          </Field>
          <Button type="submit" className="sm:col-span-2 lg:col-span-1">
            <ListFilter aria-hidden />
            Filter
          </Button>
        </form>
        {logs.length === 0 ? (
          <p className="rounded-xl bg-cream/70 px-4 py-3.5 text-sm text-ink-muted">No activity matches these filters.</p>
        ) : (
          <ol className="-mx-2 divide-y divide-line">
            {logs.map(({ log, name }) => (
              <li key={log.id} className="flex items-start gap-3 rounded-xl px-2 py-3">
                <ActivityIcon action={log.action} entity={log.targetEntity} />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="text-ink">
                    <span className="font-semibold">{name ?? "System"}</span> · {log.action}
                    {" · "}
                    {log.targetEntity === "report" || log.targetEntity === "claim" ? (
                      <Link href={`/admin/${log.targetEntity}s/${log.targetId}`} className="font-medium text-crimson hover:underline">
                        {log.targetEntity} #{log.targetId}
                      </Link>
                    ) : (
                      <span className="text-ink-muted">
                        {log.targetEntity} {log.targetId.length > 12 ? "" : `#${log.targetId}`}
                      </span>
                    )}
                  </p>
                  {log.details && <p className="mt-0.5 text-ink-soft">{log.details}</p>}
                </div>
                <time className="shrink-0 whitespace-nowrap pt-0.5 text-xs text-ink-muted">{formatDateTime(log.dateLogged)}</time>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

function ItemList({
  rows,
  empty,
}: {
  rows: { report: typeof schema.report.$inferSelect; storage: typeof schema.location.$inferSelect | null }[];
  empty: string;
}) {
  if (!rows.length) return <p className="rounded-xl bg-cream/70 px-4 py-3.5 text-sm text-ink-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line rounded-xl border border-line">
      {rows.map(({ report: r, storage }) => (
        <li key={r.id}>
          <Link href={`/admin/reports/${r.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 hover:bg-sand/60">
            <span className="min-w-0 flex-1 text-sm font-semibold text-ink">
              #{r.id} {r.itemName}
            </span>
            <ReportStatusBadge status={r.status} size="sm" />
            <span className="w-full text-xs text-ink-muted">
              {storage ? locationLabel(storage) : "No storage"} · verified {formatDate(r.dateVerified)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
