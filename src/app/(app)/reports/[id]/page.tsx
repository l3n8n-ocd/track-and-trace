import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { MatchStatusBadge, ReportStatusBadge, TypeBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Card, DetailList, LinkButton, PageHeader } from "@/components/ui";
import { db, schema } from "@/db";
import { formatDate, formatDateTime } from "@/lib/format";
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={report.itemName}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <TypeBadge type={report.reportType} /> <ReportStatusBadge status={report.status} /> Report #{report.id} ·
            filed {formatDateTime(report.dateReported)}
          </span>
        }
        actions={
          editable && (
            <>
              <LinkButton href={`/reports/${id}/edit`} variant="secondary">
                Edit
              </LinkButton>
              <form action={withdrawReportAction.bind(null, id)}>
                <SubmitButton variant="danger" pendingText="Withdrawing…">
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
      {!lost && report.status === "PENDING" && !sp.created && (
        <Alert tone="amber">Waiting for the Lost and Found Office to receive and verify this item.</Alert>
      )}

      <Card>
        <DetailList
          items={[
            ["Category", report.category.name],
            [lost ? "Date lost" : "Date found", formatDate(report.dateLostOrFound)],
            ["Place", [locationLabel(report.location), report.locationNote].filter(Boolean).join(", ")],
            ["Color", report.color],
            ["Brand", report.brand],
            ["Description", report.description],
            ["Hidden details (only you and admins)", report.hiddenDetails],
          ]}
        />
        {report.images.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {report.images.map((img) => (
              <a key={img.id} href={photoUrl(img.imagePath, { width: 1600 })} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl(img.imagePath, { width: 400 })} alt={report.itemName} className="aspect-square w-full rounded-md object-cover ring-1 ring-slate-200" />
              </a>
            ))}
          </div>
        )}
      </Card>

      {lost && (
        <Card>
          <h2 className="font-semibold">Possible matches</h2>
          {matches.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">
              No matches yet. Track-and-Trace checks new found reports automatically and will notify you.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {matches.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{m.foundReport.itemName}</p>
                    <p className="text-sm text-slate-600">
                      {m.foundReport.category.name} · {m.foundReport.location.buildingName} · found{" "}
                      {formatDate(m.foundReport.dateLostOrFound)} · score {m.matchScore.toFixed(0)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <MatchStatusBadge status={m.matchStatus} />
                    <Link href={`/items/${m.foundReportId}?match=${m.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                      View
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
