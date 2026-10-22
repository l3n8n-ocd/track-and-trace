import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { ReportStatusBadge, TypeBadge } from "@/components/status-badge";
import { Alert, EmptyState, LinkButton, PageHeader, cn } from "@/components/ui";
import { schema } from "@/db";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { imagesFor, selectReports } from "@/server/queries";
import { photoUrl } from "@/server/storage";

export const metadata: Metadata = { title: "My reports" };

export default async function MyReportsPage({ searchParams }: PageProps<"/reports">) {
  const user = await requireUser();
  const sp = await searchParams;
  const filter = sp.type === "lost" ? "LOST" : sp.type === "found" ? "FOUND" : null;

  const rows = await selectReports()
    .where(and(eq(schema.report.userId, user.id), filter ? eq(schema.report.reportType, filter) : undefined))
    .orderBy(desc(schema.report.dateReported));
  const images = await imagesFor(rows.map((r) => r.report.id));
  const reports = rows.map((r) => ({
    ...r.report,
    category: r.category,
    location: r.location,
    images: images.get(r.report.id) ?? [],
  }));

  const tabs = [
    { key: null, label: "All", href: "/reports" },
    { key: "LOST", label: "Lost", href: "/reports?type=lost" },
    { key: "FOUND", label: "Found", href: "/reports?type=found" },
  ];

  return (
    <div>
      <PageHeader
        title="My reports"
        description="Items you reported lost or found."
        actions={
          <>
            <LinkButton href="/reports/new?type=lost">Report lost item</LinkButton>
            <LinkButton href="/reports/new?type=found" variant="secondary">
              Report found item
            </LinkButton>
          </>
        }
      />
      {sp.withdrawn && (
        <div className="mb-4">
          <Alert tone="green">The report was withdrawn.</Alert>
        </div>
      )}
      <div className="mb-4 flex gap-2">
        {tabs.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={cn(
              "rounded-full px-3 py-1 text-sm",
              filter === t.key ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {reports.length === 0 ? (
        <EmptyState title="No reports yet">Report a lost or found item to get started.</EmptyState>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
          {reports.map((r) => (
            <li key={r.id}>
              <Link href={`/reports/${r.id}`} className="flex items-center gap-4 p-4 hover:bg-slate-50">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-slate-100">
                  {r.images[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl(r.images[0].imagePath, { width: 120 })} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <TypeBadge type={r.reportType} />
                    <span className="truncate font-medium">{r.itemName}</span>
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-600">
                    {r.category.name} · {r.location.buildingName} · {formatDate(r.dateLostOrFound)}
                  </p>
                </div>
                <ReportStatusBadge status={r.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
