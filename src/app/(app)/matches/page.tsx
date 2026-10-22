import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { MatchStatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { db, schema } from "@/db";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { imagesFor } from "@/server/queries";
import { photoUrl } from "@/server/storage";
import { dismissMatchAction } from "./actions";

export const metadata: Metadata = { title: "Matches" };

export default async function MatchesPage() {
  const user = await requireUser();
  const lost = alias(schema.report, "lost_report");
  const rows = await db
    .select({
      match: schema.matchRecord,
      lostItemName: lost.itemName,
      found: schema.report,
      category: schema.category,
      location: schema.location,
    })
    .from(schema.matchRecord)
    .innerJoin(lost, eq(lost.id, schema.matchRecord.lostReportId))
    .innerJoin(schema.report, eq(schema.report.id, schema.matchRecord.foundReportId))
    .innerJoin(schema.category, eq(schema.category.id, schema.report.categoryId))
    .innerJoin(schema.location, eq(schema.location.id, schema.report.locationId))
    .where(
      and(
        eq(lost.userId, user.id),
        inArray(schema.matchRecord.matchStatus, ["PENDING_VERIFICATION", "CONFIRMED"]),
      ),
    )
    .orderBy(desc(schema.matchRecord.dateMatched));
  const images = await imagesFor(rows.map((r) => r.found.id));
  const matches = rows.map((r) => ({
    ...r.match,
    lostReport: { itemName: r.lostItemName },
    foundReport: { ...r.found, category: r.category, location: r.location, images: images.get(r.found.id) ?? [] },
  }));

  return (
    <div>
      <PageHeader
        title="Possible matches"
        description="Found items that look like something you reported lost. A match is only a suggestion; the office verifies ownership before releasing any item."
      />
      {matches.length === 0 ? (
        <EmptyState title="No matches right now">
          We compare every new found report with your lost reports and will notify you when something
          looks similar. You can also{" "}
          <Link href="/search" className="text-brand-700 underline">
            search found items
          </Link>{" "}
          yourself.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {matches.map((m) => {
            const f = m.foundReport;
            const img = f.images[0];
            const claimable = f.status === "VERIFIED" && m.matchStatus === "PENDING_VERIFICATION";
            return (
              <li key={m.id} className="flex flex-col gap-4 rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center">
                <div className="h-20 w-full shrink-0 overflow-hidden rounded-md bg-slate-100 sm:w-24">
                  {img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl(img.imagePath, { blurred: true, width: 200 })} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">For your lost “{m.lostReport.itemName}”</p>
                  <p className="font-medium">{f.itemName}</p>
                  <p className="text-sm text-slate-600">
                    {f.category.name} · {f.location.buildingName} · found {formatDate(f.dateLostOrFound)}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <MatchStatusBadge status={m.matchStatus} />
                    <span>Match score {m.matchScore.toFixed(0)}/100</span>
                    {f.status === "PENDING" && <span>· Not yet received by the office</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <LinkButton href={`/items/${f.id}?match=${m.id}`} variant="secondary" size="sm">
                    View
                  </LinkButton>
                  {claimable && (
                    <LinkButton href={`/items/${f.id}/claim?match=${m.id}`} size="sm">
                      This is mine
                    </LinkButton>
                  )}
                  {m.matchStatus === "PENDING_VERIFICATION" && (
                    <form action={dismissMatchAction.bind(null, m.id)}>
                      <SubmitButton variant="ghost" size="sm" pendingText="…">
                        Not mine
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
