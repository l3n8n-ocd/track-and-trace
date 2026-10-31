import "server-only";
import { and, count, eq, inArray, lt, sql } from "drizzle-orm";
import { cache } from "react";
import { db, schema } from "@/db";
import { daysAgo } from "@/lib/format";
import { memoizeClientRequest } from "@/lib/session";

// React cache only deduplicates within the current server render. These live,
// user-specific counts must never be reused across requests or accounts.
export const pendingReportCount = cache(() => memoizeClientRequest("counts:pending-reports", async () => {
  const [row] = await db.select({ value: count() }).from(schema.report).where(eq(schema.report.status, "PENDING"));
  return row.value;
}));

export const adminClaimCounts = cache(() => memoizeClientRequest("counts:admin-claims", async () => {
  const rows = await db
    .select({ status: schema.claim.claimStatus, value: count() })
    .from(schema.claim)
    .where(inArray(schema.claim.claimStatus, ["PENDING", "APPROVED"]))
    .groupBy(schema.claim.claimStatus);
  return {
    pending: rows.find((r) => r.status === "PENDING")?.value ?? 0,
    approved: rows.find((r) => r.status === "APPROVED")?.value ?? 0,
  };
}));

// Storage totals and the status chart share one pass over the report table.
export async function adminReportBreakdown() {
  const nearExpiry = daysAgo(50);
  return db
    .select({
      type: schema.report.reportType,
      status: schema.report.status,
      value: count(),
      expiring: sql<number>`count(case when ${lt(schema.report.dateVerified, nearExpiry)} then 1 end)`.mapWith(Number),
    })
    .from(schema.report)
    .groupBy(schema.report.reportType, schema.report.status);
}

export const pendingMatchCount = cache((userId: string) => memoizeClientRequest(`counts:matches:${userId}`, async () => {
  const myLost = db
    .select({ id: schema.report.id })
    .from(schema.report)
    .where(and(eq(schema.report.userId, userId), eq(schema.report.reportType, "LOST")));
  const [row] = await db
    .select({ value: count() })
    .from(schema.matchRecord)
    .where(and(eq(schema.matchRecord.matchStatus, "PENDING_VERIFICATION"), inArray(schema.matchRecord.lostReportId, myLost)));
  return row;
}));
