import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, or, type SQL } from "drizzle-orm";
import { ChevronRight, FileSearch, FileText, ListFilter, Search, Tags } from "lucide-react";
import { Flash } from "@/components/flash";
import { REPORT_TAG, ReportStatusBadge, TypeBadge } from "@/components/status-badge";
import { Avatar, Button, EmptyState, Field, ICON_STROKE, Input, PageHeader, Pagination, Select, Tabs, Toolbar } from "@/components/ui";
import { db, schema } from "@/db";
import { REPORT_STATUSES } from "@/db/schema";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { REPORT_STATUS_LABEL } from "@/lib/status";
import { containsCI } from "@/server/sql";

export const metadata: Metadata = { title: "Reports" };
const PAGE_SIZE = 25;

export default async function AdminReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  await requireAdmin();
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const status = (REPORT_STATUSES as readonly string[]).includes(s("status")) ? (s("status") as (typeof REPORT_STATUSES)[number]) : null;
  const type = s("type") === "LOST" || s("type") === "FOUND" ? (s("type") as "LOST" | "FOUND") : null;
  const q = s("q").slice(0, 100);
  const page = Math.max(1, Number(s("page")) || 1);

  const filters: (SQL | undefined)[] = [
    status ? eq(schema.report.status, status) : undefined,
    type ? eq(schema.report.reportType, type) : undefined,
    q
      ? or(
          containsCI(schema.report.itemName, q),
          containsCI(schema.report.description, q),
          containsCI(schema.user.name, q),
          /^\d+$/.test(q) ? eq(schema.report.id, Number(q)) : undefined,
        )
      : undefined,
  ];
  const where = and(...filters);
  const base = () =>
    db
      .select({
        id: schema.report.id,
        type: schema.report.reportType,
        itemName: schema.report.itemName,
        status: schema.report.status,
        date: schema.report.dateLostOrFound,
        reported: schema.report.dateReported,
        reporter: schema.user.name,
        category: schema.category.name,
        building: schema.location.buildingName,
      })
      .from(schema.report)
      .innerJoin(schema.user, eq(schema.user.id, schema.report.userId))
      .innerJoin(schema.category, eq(schema.category.id, schema.report.categoryId))
      .innerJoin(schema.location, eq(schema.location.id, schema.report.locationId));

  const [rows, [{ total }], statusCounts] = await Promise.all([
    base().where(where).orderBy(desc(schema.report.dateReported)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(schema.report)
      .innerJoin(schema.user, eq(schema.user.id, schema.report.userId))
      .where(where),
    // Counts per status for the tabs, within the current type filter.
    db
      .select({ status: schema.report.status, value: count() })
      .from(schema.report)
      .where(type ? eq(schema.report.reportType, type) : undefined)
      .groupBy(schema.report.status),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (p: number, over: { status?: string | null; type?: string | null } = {}) => {
    const params = new URLSearchParams();
    const st = over.status !== undefined ? over.status : status;
    const ty = over.type !== undefined ? over.type : type;
    if (st) params.set("status", st);
    if (ty) params.set("type", ty);
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/admin/reports${qs ? `?${qs}` : ""}`;
  };
  const statusCount = (st: string) => statusCounts.find((c) => c.status === st)?.value ?? 0;

  return (
    <div>
      <PageHeader icon={FileText} title="Reports" description="Verify surrendered items, assign storage, and manage records." />
      <Flash sp={sp} />
      <Tabs
        className="mb-4"
        items={[
          { href: link(1, { status: null }), label: "All", active: !status, count: statusCounts.reduce((n, c) => n + c.value, 0) },
          ...REPORT_STATUSES.map((st) => ({
            href: link(1, { status: st }),
            label: REPORT_STATUS_LABEL[st],
            active: status === st,
            count: statusCount(st),
            icon: REPORT_TAG[st].icon,
          })),
        ]}
      />
      <Toolbar className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {status && <input type="hidden" name="status" value={status} />}
        <Field label="Search" htmlFor="q" className="flex-1">
          <Input id="q" name="q" icon={Search} defaultValue={q} placeholder="Item, description, reporter, or report #" />
        </Field>
        <Field label="Type" htmlFor="type" className="sm:w-56">
          <Select id="type" name="type" icon={Tags} defaultValue={type ?? ""}>
            <option value="">Lost and found</option>
            <option value="LOST">Lost only</option>
            <option value="FOUND">Found only</option>
          </Select>
        </Field>
        <Button type="submit">
          <ListFilter aria-hidden />
          Apply
        </Button>
      </Toolbar>
      {rows.length === 0 ? (
        <EmptyState icon={FileSearch} title="No reports match these filters">
          Try another status or clear the search.
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-paper">
          <table className="min-w-full text-sm max-md:block">
            <thead className="bg-cream/70 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted max-md:hidden">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Reporter</th>
                <th className="px-4 py-3">Place and date</th>
                <th className="px-4 py-3">Status</th>
                <th className="w-8 px-2 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line max-md:block">
              {rows.map((r) => (
                <tr key={r.id} className="group relative transition-colors hover:bg-sand/50 max-md:flex max-md:flex-col max-md:gap-2 max-md:p-4">
                  <td className="px-4 py-3 max-md:p-0">
                    <div className="flex items-center gap-3">
                      <TypeBadge type={r.type} />
                      <div className="min-w-0">
                        <Link href={`/admin/reports/${r.id}`} className="font-semibold text-ink after:absolute after:inset-0 hover:text-crimson">
                          {r.itemName}
                        </Link>
                        <div className="text-xs text-ink-muted">
                          #{r.id} · {r.category}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 max-md:p-0">
                    <span className="flex items-center gap-2 text-ink-soft">
                      <Avatar name={r.reporter} className="size-7 text-[10px]" />
                      {r.reporter}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft max-md:p-0">
                    {r.building}
                    <div className="text-xs text-ink-muted">{formatDate(r.date)}</div>
                  </td>
                  <td className="px-4 py-3 max-md:p-0">
                    <ReportStatusBadge status={r.status} size="sm" />
                  </td>
                  <td className="px-2 py-3 max-md:hidden">
                    <ChevronRight aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-ink-faint group-hover:text-ink" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={pages} href={(p) => link(p)} summary={`${total} reports`} />
    </div>
  );
}
