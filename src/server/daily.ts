import "server-only";
import { and, eq, gt, inArray, lt, lte, notInArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatDate } from "@/lib/format";
import { logActivity } from "./activity";
import { lapseClaim } from "./claims";
import { runMatchingForOpenLostReports } from "./matching";
import { notify, notifyAdmins } from "./notify";

export const FOUND_RETENTION_DAYS = 60;
export const LOST_RETENTION_DAYS = 90;
export const CLOSE_CLAIMED_AFTER_DAYS = 3;

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

// The once-a-day job (system design §5): reminders, lapses, expiry, and a
// matching pass. Each step is independent, so one failure doesn't stop the rest.
export async function runDailyJobs() {
  const summary: Record<string, number | string> = {};
  const step = async (name: string, fn: () => Promise<number>) => {
    try {
      summary[name] = await fn();
    } catch (error) {
      console.error(`[daily] ${name} failed`, error);
      summary[name] = "failed";
    }
  };

  // 1. Pickup reminders for approved claims due within a day.
  await step("pickupReminders", async () => {
    const now = new Date();
    const soon = new Date(Date.now() + 36 * 3_600_000);
    const due = await db
      .select({ claim: schema.claim, itemName: schema.report.itemName })
      .from(schema.claim)
      .innerJoin(schema.report, eq(schema.report.id, schema.claim.reportId))
      .where(
        and(
          eq(schema.claim.claimStatus, "APPROVED"),
          eq(schema.claim.reminderSent, false),
          gt(schema.claim.pickupDeadline, now),
          lte(schema.claim.pickupDeadline, soon),
        ),
      );
    for (const { claim, itemName } of due) {
      await notify(claim.claimantId, {
        type: "PICKUP_REMINDER",
        message: `Reminder: pick up "${itemName}" at the Lost and Found Office by ${formatDate(claim.pickupDeadline)}.`,
        link: `/claims/${claim.id}`,
        claimId: claim.id,
        email: { subject: "Pickup reminder", title: "Don't forget to pick up your item" },
      });
      await db.update(schema.claim).set({ reminderSent: true }).where(eq(schema.claim.id, claim.id));
    }
    return due.length;
  });

  // 2. Approved claims past their deadline lapse.
  await step("lapsedClaims", async () => {
    const overdue = await db
      .select({ id: schema.claim.id })
      .from(schema.claim)
      .where(and(eq(schema.claim.claimStatus, "APPROVED"), lt(schema.claim.pickupDeadline, new Date())));
    for (const c of overdue) await lapseClaim(c.id);
    return overdue.length;
  });

  // 3. Found items unclaimed for 60 days expire.
  await step("expiredFound", async () => {
    const withApprovedClaim = db
      .select({ id: schema.claim.reportId })
      .from(schema.claim)
      .where(eq(schema.claim.claimStatus, "APPROVED"));
    const stale = await db
      .select({ id: schema.report.id, itemName: schema.report.itemName })
      .from(schema.report)
      .where(
        and(
          eq(schema.report.reportType, "FOUND"),
          eq(schema.report.status, "VERIFIED"),
          lt(schema.report.dateVerified, daysAgo(FOUND_RETENTION_DAYS)),
          notInArray(schema.report.id, withApprovedClaim),
        ),
      );
    if (stale.length) {
      await db.update(schema.report).set({ status: "EXPIRED" }).where(inArray(schema.report.id, stale.map((s) => s.id)));
      for (const s of stale) await logActivity(null, "Report expired (unclaimed)", "report", s.id);
      await notifyAdmins({
        type: "ITEMS_EXPIRED",
        message: `${stale.length} found item${stale.length > 1 ? "s were" : " was"} unclaimed for ${FOUND_RETENTION_DAYS} days and marked expired.`,
        link: "/admin/records",
      });
    }
    return stale.length;
  });

  // 4. Lost reports older than 90 days expire.
  await step("expiredLost", async () => {
    const stale = await db
      .select({ id: schema.report.id, userId: schema.report.userId, itemName: schema.report.itemName })
      .from(schema.report)
      .where(
        and(
          eq(schema.report.reportType, "LOST"),
          inArray(schema.report.status, ["PENDING", "VERIFIED"]),
          lt(schema.report.dateReported, daysAgo(LOST_RETENTION_DAYS)),
        ),
      );
    for (const s of stale) {
      await db.update(schema.report).set({ status: "EXPIRED" }).where(eq(schema.report.id, s.id));
      await notify(s.userId, {
        type: "REPORT_EXPIRED",
        message: `Your lost report for "${s.itemName}" is now ${LOST_RETENTION_DAYS} days old and was closed. File a new one if you're still looking.`,
        link: `/reports/${s.id}`,
        reportId: s.id,
      });
      await logActivity(null, "Report expired", "report", s.id);
    }
    return stale.length;
  });

  // 5. Released items' records close after a few days.
  await step("closedClaimed", async () => {
    const done = await db
      .select({ id: schema.report.id })
      .from(schema.report)
      .where(and(eq(schema.report.status, "CLAIMED"), lt(schema.report.updatedAt, daysAgo(CLOSE_CLAIMED_AFTER_DAYS))));
    if (done.length) {
      await db.update(schema.report).set({ status: "CLOSED" }).where(inArray(schema.report.id, done.map((d) => d.id)));
    }
    return done.length;
  });

  // 6. Matching pass for open lost reports.
  await step("matchingPass", () => runMatchingForOpenLostReports());

  console.info("[daily] done", summary);
  return summary;
}
