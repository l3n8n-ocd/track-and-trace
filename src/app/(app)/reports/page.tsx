import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq } from "drizzle-orm";
import { CalendarDays, ChevronRight, FileText, ImageOff, MapPin, Plus, Tag } from "lucide-react";
import { ReportStatusBadge, StageMeter, TypeBadge } from "@/components/status-badge";
import { Alert, EmptyState, ICON_STROKE, LinkButton, PageHeader, Tabs } from "@/components/ui";
import { db, schema } from "@/db";
import { formatDate } from "@/lib/format";
import { journeyProgress, reportJourney } from "@/lib/journey";
import { requireUser } from "@/lib/session";
import { imagesFor, matchedLostIds, selectReports } from "@/server/queries";
import { photoUrl } from "@/server/storage";

export const metadata: Metadata = { title: "My reports" };

export default async function MyReportsPage({ searchParams }: PageProps<"/reports">) {
  const user = await requireUser();
  const sp = await searchParams;
  const filter = sp.type === "lost" ? "LOST" : sp.type === "found" ? "FOUND" : null;

  const [rows, typeCounts] = await Promise.all([
    selectReports()
      .where(and(eq(schema.report.userId, user.id), filter ? eq(schema.report.reportType, filter) : undefined))
      .orderBy(desc(schema.report.dateReported)),
    db
      .select({ type: schema.report.reportType, value: count() })
      .from(schema.report)
      .where(eq(schema.report.userId, user.id))
      .groupBy(schema.report.reportType),
  ]);
  const ids = rows.map((r) => r.report.id);
  const [images, matched] = await Promise.all([
    imagesFor(ids),
    matchedLostIds(rows.filter((r) => r.report.reportType === "LOST").map((r) => r.report.id)),
  ]);
  const reports = rows.map((r) => ({
    ...r.report,
    category: r.category,
    location: r.location,
    images: images.get(r.report.id) ?? [],
  }));
  const n = (t: "LOST" | "FOUND") => typeCounts.find((c) => c.type === t)?.value ?? 0;

  return (
    <div>
      <PageHeader
        icon={FileText}
        title="My reports"
        description="Items you reported lost or found, and where each one is in the process."
        actions={
          <>
            <LinkButton href="/reports/new?type=lost">
              <Plus aria-hidden />
              Report lost item
            </LinkButton>
            <LinkButton href="/reports/new?type=found" variant="secondary">
              <Plus aria-hidden />
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
      <Tabs
        className="mb-4"
        items={[
          { href: "/reports", label: "All", active: filter === null, count: n("LOST") + n("FOUND") },
          { href: "/reports?type=lost", label: "Lost", active: filter === "LOST", count: n("LOST") },
          { href: "/reports?type=found", label: "Found", active: filter === "FOUND", count: n("FOUND") },
        ]}
      />
      {reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports yet"
          action={<LinkButton href="/reports/new">Report an item</LinkButton>}
        >
          Report a lost or found item to get started. It takes about two minutes.
        </EmptyState>
      ) : (
        <ul className="space-y-2.5">
          {reports.map((r) => {
            const p = journeyProgress(reportJourney(r, { audience: "owner", hasMatch: matched.has(r.id) }));
            return (
              <li key={r.id}>
                <Link
                  href={`/reports/${r.id}`}
                  className="group flex items-center gap-4 rounded-2xl border border-line bg-paper p-3 pr-4 transition-colors hover:border-line-strong hover:bg-white sm:p-4"
                >
                  <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sand sm:size-20">
                    {r.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoUrl(r.images[0].imagePath, { width: 160 })} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImageOff aria-hidden strokeWidth={ICON_STROKE} className="size-5 text-ink-faint" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <TypeBadge type={r.reportType} />
                      <span className="truncate text-[15px] font-semibold text-ink">{r.itemName}</span>
                    </div>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-muted">
                      <span className="inline-flex items-center gap-1">
                        <Tag aria-hidden strokeWidth={ICON_STROKE} className="size-3.5" />
                        {r.category.name}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin aria-hidden strokeWidth={ICON_STROKE} className="size-3.5" />
                        {r.location.buildingName}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays aria-hidden strokeWidth={ICON_STROKE} className="size-3.5" />
                        {formatDate(r.dateLostOrFound)}
                      </span>
                    </p>
                    <div className="mt-2 sm:hidden">
                      <ReportStatusBadge status={r.status} size="sm" />
                    </div>
                  </div>
                  <div className="hidden flex-col items-end gap-2 sm:flex">
                    <ReportStatusBadge status={r.status} />
                    <StageMeter {...p} label={`Step ${Math.min(p.done + 1, p.total)} of ${p.total}`} />
                  </div>
                  <ChevronRight
                    aria-hidden
                    strokeWidth={ICON_STROKE}
                    className="size-5 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
