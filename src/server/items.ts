import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { ACTIVE_CLAIM_STATUSES } from "@/lib/status";
import { imagesFor, selectReports } from "./queries";

// A found report as other users may see it: public fields only (FR-S2).
// Visible when the office has verified it, or when the viewer has a match
// to it.
export async function getPublicFoundItem(reportId: number, viewerId: string) {
  const [row] = await selectReports().where(
    and(eq(schema.report.id, reportId), eq(schema.report.reportType, "FOUND")),
  );
  if (!row) return null;
  const report = row.report;

  const viewerMatches = await db
    .select({ id: schema.matchRecord.id, status: schema.matchRecord.matchStatus, lostItem: schema.report.itemName })
    .from(schema.matchRecord)
    .innerJoin(schema.report, eq(schema.report.id, schema.matchRecord.lostReportId))
    .where(and(eq(schema.matchRecord.foundReportId, reportId), eq(schema.report.userId, viewerId)));

  const visible =
    report.userId === viewerId || report.status === "VERIFIED" || viewerMatches.length > 0;
  if (!visible) return null;

  const myClaim = await db.query.claim.findFirst({
    where: and(
      eq(schema.claim.reportId, reportId),
      eq(schema.claim.claimantId, viewerId),
      inArray(schema.claim.claimStatus, ACTIVE_CLAIM_STATUSES),
    ),
  });

  return {
    id: report.id,
    itemName: report.itemName,
    dateFound: report.dateLostOrFound,
    status: report.status,
    category: row.category.name,
    building: row.location.buildingName,
    images: ((await imagesFor([report.id])).get(report.id) ?? []).map((i) => i.imagePath),
    isOwnReport: report.userId === viewerId,
    matches: viewerMatches,
    myClaim,
  };
}
