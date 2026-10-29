import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { db, schema } from "@/db";
import { getSessionUser } from "@/lib/session";
import { logActivity } from "@/server/activity";

// CSV exports for record keeping (FR-M6). Administrators only.
function csv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    const s = v instanceof Date ? v.toISOString() : v === null || v === undefined ? "" : String(v);
    // Quote everything; neutralize spreadsheet formulas.
    return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => cell(r[h])).join(","))].join("\r\n");
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return new Response("Forbidden", { status: 403 });
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const range = (col: Parameters<typeof gte>[0]): (SQL | undefined)[] => [
    from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? gte(col, new Date(`${from}T00:00:00+08:00`)) : undefined,
    to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? lte(col, new Date(`${to}T23:59:59+08:00`)) : undefined,
  ];

  let rows: Record<string, unknown>[];
  if (type === "reports") {
    rows = await db
      .select({
        report_id: schema.report.id,
        type: schema.report.reportType,
        item: schema.report.itemName,
        category: schema.category.name,
        color: schema.report.color,
        brand: schema.report.brand,
        date_lost_or_found: schema.report.dateLostOrFound,
        place: schema.location.buildingName,
        status: schema.report.status,
        reporter: schema.user.name,
        reporter_id_number: schema.user.idNumber,
        date_reported: schema.report.dateReported,
        date_verified: schema.report.dateVerified,
      })
      .from(schema.report)
      .innerJoin(schema.category, eq(schema.category.id, schema.report.categoryId))
      .innerJoin(schema.location, eq(schema.location.id, schema.report.locationId))
      .innerJoin(schema.user, eq(schema.user.id, schema.report.userId))
      .where(and(...range(schema.report.dateReported)))
      .orderBy(desc(schema.report.dateReported));
  } else if (type === "claims") {
    const reviewer = alias(schema.user, "reviewer");
    rows = await db
      .select({
        claim_id: schema.claim.id,
        report_id: schema.claim.reportId,
        item: schema.report.itemName,
        claimant: schema.user.name,
        claimant_id_number: schema.user.idNumber,
        status: schema.claim.claimStatus,
        claim_date: schema.claim.claimDate,
        reviewed_by: reviewer.name,
        date_reviewed: schema.claim.dateReviewed,
        pickup_deadline: schema.claim.pickupDeadline,
        date_released: schema.claim.dateReleased,
        rejection_reason: schema.claim.rejectionReason,
      })
      .from(schema.claim)
      .innerJoin(schema.report, eq(schema.report.id, schema.claim.reportId))
      .innerJoin(schema.user, eq(schema.user.id, schema.claim.claimantId))
      .leftJoin(reviewer, eq(reviewer.id, schema.claim.reviewedBy))
      .where(and(...range(schema.claim.claimDate)))
      .orderBy(desc(schema.claim.claimDate));
  } else if (type === "activity") {
    rows = await db
      .select({
        when: schema.activityLog.dateLogged,
        who: schema.user.name,
        action: schema.activityLog.action,
        record_type: schema.activityLog.targetEntity,
        record_id: schema.activityLog.targetId,
        details: schema.activityLog.details,
      })
      .from(schema.activityLog)
      .leftJoin(schema.user, eq(schema.user.id, schema.activityLog.userId))
      .where(and(...range(schema.activityLog.dateLogged)))
      .orderBy(desc(schema.activityLog.dateLogged));
  } else {
    return new Response("Unknown export type", { status: 400 });
  }

  await logActivity(user.id, `Exported ${type}`, "export", type, `${rows.length} rows`);
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="track-and-trace-${type}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
