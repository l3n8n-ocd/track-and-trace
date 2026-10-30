import type { Metadata } from "next";
import { and, desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { Hand, Hourglass, ImageOff, Link2, ScanSearch } from "lucide-react";
import { MatchScore, MatchStatusBadge, TypeBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { EmptyState, ICON_STROKE, LinkButton, PageHeader, cn } from "@/components/ui";
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
    <div className="mx-auto max-w-4xl">
      <PageHeader
        icon={ScanSearch}
        title="Possible matches"
        description="Found items that look like something you reported lost. A match is only a suggestion; the office verifies ownership before releasing any item."
      />
      {matches.length === 0 ? (
        <EmptyState
          icon={ScanSearch}
          title="No matches right now"
          action={<LinkButton href="/search" variant="secondary">Search found items</LinkButton>}
        >
          We compare every new found report with your lost reports and will notify you when something looks
          similar. You can also search found items yourself.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {matches.map((m) => {
            const f = m.foundReport;
            const img = f.images[0];
            const claimable = f.status === "VERIFIED" && m.matchStatus === "PENDING_VERIFICATION";
            return (
              <li
                key={m.id}
                className={cn(
                  "overflow-hidden rounded-2xl border bg-paper",
                  m.matchStatus === "PENDING_VERIFICATION" ? "border-line-strong" : "border-line",
                )}
              >
                <p className="flex items-center gap-2 border-b border-line bg-cream/70 px-4 py-2.5 text-[13px] text-ink-soft">
                  <Link2 aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-crimson" />
                  For your lost “{m.lostReport.itemName}”
                </p>
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <div className="h-40 w-full shrink-0 overflow-hidden rounded-xl bg-sand sm:size-24">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoUrl(img.imagePath, { blurred: true, width: 240 })} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-ink-faint">
                        <ImageOff aria-hidden strokeWidth={ICON_STROKE} className="size-6" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <TypeBadge type="FOUND" />
                      <p className="font-semibold text-ink">{f.itemName}</p>
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">
                      {f.category.name} · {f.location.buildingName} · found {formatDate(f.dateLostOrFound)}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-3">
                      <MatchStatusBadge status={m.matchStatus} size="sm" />
                      <MatchScore score={m.matchScore} />
                      {f.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-rust">
                          <Hourglass aria-hidden strokeWidth={ICON_STROKE} className="size-3.5" />
                          Not yet received by the office
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
                    {claimable && (
                      <LinkButton href={`/items/${f.id}/claim?match=${m.id}`} size="sm">
                        <Hand aria-hidden />
                        This is mine
                      </LinkButton>
                    )}
                    <LinkButton href={`/items/${f.id}?match=${m.id}`} variant="secondary" size="sm">
                      View details
                    </LinkButton>
                    {m.matchStatus === "PENDING_VERIFICATION" && (
                      <form action={dismissMatchAction.bind(null, m.id)}>
                        <SubmitButton variant="ghost" size="sm" pendingText="…" className="w-full">
                          Not mine
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
