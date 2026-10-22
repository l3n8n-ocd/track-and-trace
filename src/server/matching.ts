import "server-only";
import { and, eq, inArray, ne, or } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  MATCH_THRESHOLD,
  MAX_MATCHES_PER_REPORT,
  scoreMatch,
  withinDateWindow,
  type MatchableReport,
} from "@/lib/matching";
import { OPEN_REPORT_STATUSES } from "@/lib/status";
import { notify } from "./notify";

type Row = MatchableReport & { id: number; userId: string; reportType: "LOST" | "FOUND" };

function selectMatchable() {
  return db
    .select({
      id: schema.report.id,
      userId: schema.report.userId,
      reportType: schema.report.reportType,
      itemName: schema.report.itemName,
      description: schema.report.description,
      categoryId: schema.report.categoryId,
      categoryParentId: schema.category.parentId,
      locationId: schema.report.locationId,
      buildingName: schema.location.buildingName,
      color: schema.report.color,
      brand: schema.report.brand,
      dateLostOrFound: schema.report.dateLostOrFound,
    })
    .from(schema.report)
    .innerJoin(schema.category, eq(schema.category.id, schema.report.categoryId))
    .innerJoin(schema.location, eq(schema.location.id, schema.report.locationId));
}

// Compares one report with open reports of the opposite type and stores
// the best matches (system design §9). Runs after the response is sent.
export async function runMatchingForReport(reportId: number) {
  const [target] = (await selectMatchable().where(eq(schema.report.id, reportId))) as Row[];
  if (!target) return;
  const current = await db.query.report.findFirst({
    columns: { status: true },
    where: eq(schema.report.id, reportId),
  });
  if (!current || !OPEN_REPORT_STATUSES.includes(current.status)) return;

  // Same category, its parent, or its children.
  const related = [target.categoryId];
  if (target.categoryParentId) related.push(target.categoryParentId);
  const children = await db
    .select({ id: schema.category.id })
    .from(schema.category)
    .where(eq(schema.category.parentId, target.categoryId));
  related.push(...children.map((c) => c.id));

  const oppositeType = target.reportType === "LOST" ? "FOUND" : "LOST";
  const candidates = (await selectMatchable().where(
    and(
      eq(schema.report.reportType, oppositeType),
      inArray(schema.report.status, OPEN_REPORT_STATUSES),
      inArray(schema.report.categoryId, related),
      ne(schema.report.userId, target.userId),
    ),
  )) as Row[];

  const scored = candidates
    .map((c) => {
      const lost = target.reportType === "LOST" ? target : c;
      const found = target.reportType === "LOST" ? c : target;
      if (!withinDateWindow(lost.dateLostOrFound, found.dateLostOrFound)) return null;
      return { lost, found, score: scoreMatch(lost, found).total };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && x.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_MATCHES_PER_REPORT);

  for (const { lost, found, score } of scored) {
    const existing = await db.query.matchRecord.findFirst({
      where: and(
        eq(schema.matchRecord.lostReportId, lost.id),
        eq(schema.matchRecord.foundReportId, found.id),
      ),
    });
    if (existing) {
      if (existing.matchStatus === "PENDING_VERIFICATION" && existing.matchScore !== score) {
        await db
          .update(schema.matchRecord)
          .set({ matchScore: score })
          .where(eq(schema.matchRecord.id, existing.id));
      }
      continue;
    }
    await db.insert(schema.matchRecord).values({
      lostReportId: lost.id,
      foundReportId: found.id,
      matchScore: score,
    });
    await notify(lost.userId, {
      type: "MATCH_FOUND",
      message: `A found item may match your lost "${lost.itemName}". Review it and file a claim if it's yours.`,
      link: "/matches",
      reportId: lost.id,
      email: { subject: "Possible match for your lost item", title: "We found a possible match", actionLabel: "View matches" },
    });
    await notify(found.userId, {
      type: "MATCH_FOUND",
      message: `The "${found.itemName}" you reported found may belong to someone who reported it lost. The office will verify any claim.`,
      link: `/reports/${found.id}`,
      reportId: found.id,
    });
  }
}

// Used by the daily job to catch matches for reports whose candidates
// arrived later (for example after an admin verified a found item).
export async function runMatchingForOpenLostReports(limit = 200) {
  const rows = await db
    .select({ id: schema.report.id })
    .from(schema.report)
    .where(
      and(
        eq(schema.report.reportType, "LOST"),
        or(eq(schema.report.status, "PENDING"), eq(schema.report.status, "VERIFIED")),
      ),
    )
    .limit(limit);
  for (const r of rows) await runMatchingForReport(r.id);
  return rows.length;
}
