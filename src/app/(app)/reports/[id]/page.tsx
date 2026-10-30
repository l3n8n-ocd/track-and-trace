import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ChevronRight, EyeOff, Info, Pencil, ScanSearch, Undo2 } from "lucide-react";
import { MatchScore, MatchStatusBadge, ReportStatusBadge, TypeBadge } from "@/components/status-badge";
import { StatusJourney } from "@/components/status-journey";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Card, CardHeader, DetailList, ICON_STROKE, LinkButton, PageHeader } from "@/components/ui";
import { db, schema } from "@/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { reportJourney } from "@/lib/journey";
import { requireUser } from "@/lib/session";
import { locationLabel } from "@/server/options";
import { imagesFor, selectReports } from "@/server/queries";
import { photoUrl } from "@/server/storage";
import { withdrawReportAction } from "../actions";

export const metadata: Metadata = { title: "Report" };

export default async function ReportPage({ params, searchParams }: PageProps<"/reports/[id]">) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const sp = await searchParams;
  const [row] = await selectReports().where(and(eq(schema.report.id, id), eq(schema.report.userId, user.id)));
  if (!row) notFound();
  const report = {
    ...row.report,
    category: row.category,
    location: row.location,
    images: (await imagesFor([id])).get(id) ?? [],
  };

  const lost = report.reportType === "LOST";
  const matches = lost
    ? (
        await db
          .select({ match: schema.matchRecord, found: schema.report, category: schema.category, location: schema.location })
          .from(schema.matchRecord)
          .innerJoin(schema.report, eq(schema.report.id, schema.matchRecord.foundReportId))
          .innerJoin(schema.category, eq(schema.category.id, schema.report.categoryId))
          .innerJoin(schema.location, eq(schema.location.id, schema.report.locationId))
          .where(eq(schema.matchRecord.lostReportId, id))
          .orderBy(desc(schema.matchRecord.matchScore))
      ).map((m) => ({ ...m.match, foundReport: { ...m.found, category: m.category, location: m.location } }))
    : [];
  const editable = ["PENDING", "VERIFIED"].includes(report.status);
  const journey = reportJourney(report, {
    audience: "owner",
    hasMatch: matches.some((m) => m.matchStatus !== "REJECTED"),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={report.itemName}
        eyebrow={
          <Link href="/reports" className="hover:text-oxblood">
            My reports · #{report.id}
          </Link>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <TypeBadge type={report.reportType} /> <ReportStatusBadge status={report.status} />
            <span className="text-sm">Filed {formatDateTime(report.dateReported)}</span>
          </span>
        }
        actions={
          editable && (
            <>
              <LinkButton href={`/reports/${id}/edit`} variant="secondary">
                <Pencil aria-hidden />
                Edit
              </LinkButton>
              <form action={withdrawReportAction.bind(null, id)}>
                <SubmitButton variant="danger" pendingText="Withdrawing…">
                  <Undo2 aria-hidden />
                  Withdraw
                </SubmitButton>
              </form>
            </>
          )
        }
      />

      {sp.created && (
        <Alert tone="green">
          Your report was submitted.{" "}
          {lost
            ? "We'll alert you when a found item looks like a match."
            : "Please bring the item to the Lost and Found Office so it can be verified and kept safe."}
        </Alert>
      )}
      {sp.updated && <Alert tone="green">Your changes were saved.</Alert>}

      <StatusJourney journey={journey} title="Where your report is" />

      <Card>
        <CardHeader icon={Info} title="Report details" />
        <DetailList
          items={[
            ["Category", report.category.name],
            [lost ? "Date lost" : "Date found", formatDate(report.dateLostOrFound)],
            ["Place", [locationLabel(report.location), report.locationNote].filter(Boolean).join(", ")],
            ["Color", report.color],
            ["Brand", report.brand],
          ]}
          columns={3}
        />
        {report.description && (
          <div className="mt-5 border-t border-line pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Description</p>
            <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-ink">{report.description}</p>
          </div>
        )}
        {report.hiddenDetails && (
          <div className="mt-4 rounded-2xl border border-crimson/15 bg-crimson-tint/40 p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-crimson">
              <EyeOff aria-hidden strokeWidth={ICON_STROKE} className="size-3.5" />
              Private · only you and admins
            </p>
            <p className="mt-1 whitespace-pre-line text-[15px] text-ink">{report.hiddenDetails}</p>
          </div>
        )}
        {report.images.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {report.images.map((img) => (
              <a
                key={img.id}
                href={photoUrl(img.imagePath, { width: 1600 })}
                target="_blank"
                rel="noreferrer"
                className="group overflow-hidden rounded-xl ring-1 ring-line"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl(img.imagePath, { width: 400 })}
                  alt={report.itemName}
                  className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </a>
            ))}
          </div>
        )}
      </Card>

      {lost && (
        <Card>
          <CardHeader
            icon={ScanSearch}
            title="Possible matches"
            description="Found items that look like yours. Only claim one if you can describe details that aren't shown."
          />
          {matches.length === 0 ? (
            <p className="rounded-xl bg-cream/70 px-4 py-3.5 text-sm text-ink-muted">
              No matches yet. Track-and-Trace checks new found reports automatically and will notify you.
            </p>
          ) : (
            <ul className="-mx-2 divide-y divide-line">
              {matches.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/items/${m.foundReportId}?match=${m.id}`}
                    className="group flex flex-wrap items-center gap-3 rounded-xl px-2 py-3 hover:bg-sand/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{m.foundReport.itemName}</p>
                      <p className="mt-0.5 text-sm text-ink-muted">
                        {m.foundReport.category.name} · {m.foundReport.location.buildingName} · found{" "}
                        {formatDate(m.foundReport.dateLostOrFound)}
                      </p>
                    </div>
                    <MatchScore score={m.matchScore} />
                    <MatchStatusBadge status={m.matchStatus} size="sm" />
                    <ChevronRight aria-hidden strokeWidth={ICON_STROKE} className="size-5 text-ink-faint group-hover:text-ink" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
