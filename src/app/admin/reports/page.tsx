import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, or, type SQL } from "drizzle-orm";
import { Flash } from "@/components/flash";
import { ReportStatusBadge, TypeBadge } from "@/components/status-badge";
import { Button, EmptyState, Field, Input, PageHeader, Select } from "@/components/ui";
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

  const [rows, [{ total }]] = await Promise.all([
    base().where(where).orderBy(desc(schema.report.dateReported)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(schema.report)
      .innerJoin(schema.user, eq(schema.user.id, schema.report.userId))
      .where(where),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (p: number) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (q) params.set("q", q);
    params.set("page", String(p));
    return `/admin/reports?${params}`;
  };

  return (
    <div>
      <PageHeader title="Reports" description="Verify surrendered items, assign storage, and manage records." />
      <Flash sp={sp} />
      <form className="mb-4 grid gap-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:grid-cols-4">
        <Field label="Search" htmlFor="q" className="sm:col-span-2">
          <Input id="q" name="q" defaultValue={q} placeholder="Item, description, reporter, or report #" />
        </Field>
        <Field label="Type" htmlFor="type">
          <Select id="type" name="type" defaultValue={type ?? ""}>
            <option value="">All</option>
            <option value="LOST">Lost</option>
            <option value="FOUND">Found</option>
          </Select>
        </Field>
        <Field label="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue={status ?? ""}>
            <option value="">All</option>
            {REPORT_STATUSES.map((st) => (
              <option key={st} value={st}>
                {REPORT_STATUS_LABEL[st]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="sm:col-span-4">
          <Button type="submit" size="sm">
            Filter
          </Button>
        </div>
      </form>
      {rows.length === 0 ? (
        <EmptyState title="No reports match these filters" />
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Item</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Reporter</th>
                <th className="px-4 py-2">Place / date</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-500">{r.id}</td>
                  <td className="px-4 py-2">
                    <Link href={`/admin/reports/${r.id}`} className="font-medium text-brand-700 hover:underline">
                      {r.itemName}
                    </Link>
                    <div className="text-xs text-slate-500">{r.category}</div>
                  </td>
                  <td className="px-4 py-2">
                    <TypeBadge type={r.type} />
                  </td>
                  <td className="px-4 py-2">{r.reporter}</td>
                  <td className="px-4 py-2">
                    {r.building}
                    <div className="text-xs text-slate-500">{formatDate(r.date)}</div>
                  </td>
                  <td className="px-4 py-2">
                    <ReportStatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link href={link(page - 1)} className="text-brand-700">← Previous</Link>}
          <span className="text-slate-600">
            Page {page} of {pages} · {total} reports
          </span>
          {page < pages && <Link href={link(page + 1)} className="text-brand-700">Next →</Link>}
        </nav>
      )}
    </div>
  );
}
