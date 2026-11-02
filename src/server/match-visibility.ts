import "server-only";
import { and, eq, inArray, notExists, or } from "drizzle-orm";
import { alias, type AnyMySqlColumn } from "drizzle-orm/mysql-core";
import { db, schema } from "@/db";
import { ACTIVE_CLAIM_STATUSES, OPEN_REPORT_STATUSES } from "@/lib/status";

type ReportColumns = { id: AnyMySqlColumn; status: AnyMySqlColumn };

// One definition for dashboard, sidebar and possible-match lists. This also
// handles claims filed from search, where the claim may have no matchId.
export function actionableMatches(userId: string, lost: ReportColumns, found: ReportColumns) {
  const related = alias(schema.matchRecord, "claim_related_match");
  const handled = db.select({ id: schema.claim.id }).from(schema.claim)
    .leftJoin(related, eq(related.foundReportId, schema.claim.reportId))
    .where(and(
      eq(schema.claim.claimantId, userId),
      inArray(schema.claim.claimStatus, ACTIVE_CLAIM_STATUSES),
      or(eq(schema.claim.reportId, found.id), and(eq(schema.claim.claimStatus, "APPROVED"), eq(related.lostReportId, lost.id))),
    ));
  return and(inArray(lost.status, OPEN_REPORT_STATUSES), inArray(found.status, OPEN_REPORT_STATUSES), notExists(handled));
}
