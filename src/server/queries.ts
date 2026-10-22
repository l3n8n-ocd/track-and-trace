import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { db, schema } from "@/db";

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
