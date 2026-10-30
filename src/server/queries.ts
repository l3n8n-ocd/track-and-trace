import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { db, schema } from "@/db";
import type { ClaimStatus } from "@/db/schema";

// Relations are loaded with plain joins and IN queries rather than Drizzle's
// relational query builder, whose LATERAL/derived-table SQL isn't supported
// by every MySQL-compatible database (MariaDB, TiDB).

export const storageLocation = alias(schema.location, "storage_location");

// A report with its category, place, and storage location.
export function selectReports() {
  return db
    .select({
      report: schema.report,
      category: schema.category,
      location: schema.location,
      storage: storageLocation,
    })
    .from(schema.report)
    .innerJoin(schema.category, eq(schema.category.id, schema.report.categoryId))
    .innerJoin(schema.location, eq(schema.location.id, schema.report.locationId))
    .leftJoin(storageLocation, eq(storageLocation.id, schema.report.storageLocationId));
}

export type ReportRow = Awaited<ReturnType<typeof selectReports>>[number];

export async function imagesFor(reportIds: number[]) {
  const map = new Map<number, { id: number; imagePath: string }[]>();
  if (!reportIds.length) return map;
  const rows = await db
    .select()
    .from(schema.reportImage)
    .where(inArray(schema.reportImage.reportId, reportIds))
    .orderBy(asc(schema.reportImage.id));
  for (const r of rows) {
    const list = map.get(r.reportId) ?? [];
    list.push({ id: r.id, imagePath: r.imagePath });
    map.set(r.reportId, list);
  }
  return map;
}

export async function proofsFor(claimIds: number[]) {
  const map = new Map<number, (typeof schema.claimProof.$inferSelect)[]>();
  if (!claimIds.length) return map;
  const rows = await db
    .select()
    .from(schema.claimProof)
    .where(inArray(schema.claimProof.claimId, claimIds))
    .orderBy(asc(schema.claimProof.dateUploaded));
  for (const r of rows) {
    const list = map.get(r.claimId) ?? [];
    list.push(r);
    map.set(r.claimId, list);
  }
  return map;
}

// Lost reports (of those given) that have an open or confirmed match, for
// the status journey.
export async function matchedLostIds(reportIds: number[]) {
  if (!reportIds.length) return new Set<number>();
  const rows = await db
    .selectDistinct({ id: schema.matchRecord.lostReportId })
    .from(schema.matchRecord)
    .where(
      and(
        inArray(schema.matchRecord.lostReportId, reportIds),
        inArray(schema.matchRecord.matchStatus, ["PENDING_VERIFICATION", "CONFIRMED"]),
      ),
    );
  return new Set(rows.map((r) => r.id));
}

// The most advanced claim on each found report (released or approved before
// anything else), for the status journey.
export async function leadingClaims(reportIds: number[]) {
  const map = new Map<number, { claimStatus: ClaimStatus; dateReviewed: Date | null; dateReleased: Date | null }>();
  if (!reportIds.length) return map;
  const rows = await db
    .select({
      reportId: schema.claim.reportId,
      claimStatus: schema.claim.claimStatus,
      dateReviewed: schema.claim.dateReviewed,
      dateReleased: schema.claim.dateReleased,
    })
    .from(schema.claim)
    .where(and(inArray(schema.claim.reportId, reportIds), inArray(schema.claim.claimStatus, ["RELEASED", "APPROVED"])));
  for (const r of rows) {
    const current = map.get(r.reportId);
    if (!current || r.claimStatus === "RELEASED") map.set(r.reportId, r);
  }
  return map;
}
