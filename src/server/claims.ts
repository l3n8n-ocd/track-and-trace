import "server-only";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import type { ClaimStatus } from "@/db/schema";
import { formatDate } from "@/lib/format";
import { canChangeClaim } from "@/lib/status";
import { logActivity } from "./activity";
import { notify, notifyAdmins } from "./notify";
import { locationLabel } from "./options";

// Claim decisions (system design §8.2, FR-C4 to FR-C8). Each function
// checks the transition, writes the change, notifies, and logs it.

export class ClaimError extends Error {}

async function loadClaim(claimId: number) {
  const [row] = await db
    .select({ claim: schema.claim, report: schema.report })
    .from(schema.claim)
    .innerJoin(schema.report, eq(schema.report.id, schema.claim.reportId))
    .where(eq(schema.claim.id, claimId));
  if (!row) throw new ClaimError("Claim not found.");
  return row;
}

function assertTransition(from: ClaimStatus, to: ClaimStatus) {
  if (!canChangeClaim(from, to)) throw new ClaimError(`A ${from.toLowerCase()} claim can't be changed to ${to.toLowerCase()}.`);
}

export async function approveClaim(adminId: string, claimId: number, pickupDeadline: Date, remarks: string | null) {
  const { claim, report } = await loadClaim(claimId);
  assertTransition(claim.claimStatus, "APPROVED");
  if (report.status !== "VERIFIED") throw new ClaimError("The found item must be verified and in storage first.");
  const other = await db.query.claim.findFirst({
    where: and(eq(schema.claim.reportId, report.id), eq(schema.claim.claimStatus, "APPROVED")),
  });
  if (other) throw new ClaimError(`Claim #${other.id} on this item is already approved.`);

  await db
    .update(schema.claim)
    .set({ claimStatus: "APPROVED", reviewedBy: adminId, dateReviewed: new Date(), pickupDeadline, remarks, reminderSent: false })
    .where(eq(schema.claim.id, claimId));

  // Other open claims on the same item wait (FR-C5).
  const waiting = await db
    .select({ id: schema.claim.id, claimantId: schema.claim.claimantId })
    .from(schema.claim)
    .where(
      and(
        eq(schema.claim.reportId, report.id),
        ne(schema.claim.id, claimId),
        inArray(schema.claim.claimStatus, ["PENDING", "MORE_INFO_NEEDED"]),
      ),
    );
  if (waiting.length) {
    await db.update(schema.claim).set({ claimStatus: "ON_HOLD" }).where(inArray(schema.claim.id, waiting.map((w) => w.id)));
    for (const w of waiting) {
      await notify(w.claimantId, {
        type: "CLAIM_ON_HOLD",
        message: `Another claim on "${report.itemName}" is being processed. Yours is on hold for now.`,
        link: `/claims/${w.id}`,
        claimId: w.id,
      });
    }
  }

  const storage = report.storageLocationId
    ? await db.query.location.findFirst({ where: eq(schema.location.id, report.storageLocationId) })
    : null;
  const place = storage ? locationLabel(storage) : "the Lost and Found Office";
  await notify(claim.claimantId, {
    type: "CLAIM_APPROVED",
    message: `Your claim for "${report.itemName}" was approved. Pick it up at ${place} by ${formatDate(pickupDeadline)}. Bring a valid ID and mention claim #${claimId}.`,
    link: `/claims/${claimId}`,
    claimId,
    reportId: report.id,
    email: {
      subject: "Your claim was approved",
      title: "Your claim was approved",
      paragraphs: remarks ? [`Note from the office: ${remarks}`] : [],
      actionLabel: "View pickup details",
    },
  });
  await logActivity(adminId, "Approved claim", "claim", claimId, `Pickup by ${formatDate(pickupDeadline)}`);
}

export async function rejectClaim(adminId: string, claimId: number, reason: string) {
  const { claim, report } = await loadClaim(claimId);
  assertTransition(claim.claimStatus, "REJECTED");
  await db
    .update(schema.claim)
    .set({ claimStatus: "REJECTED", reviewedBy: adminId, dateReviewed: new Date(), rejectionReason: reason })
    .where(eq(schema.claim.id, claimId));
  if (claim.matchId) {
    await db
      .update(schema.matchRecord)
      .set({ matchStatus: "REJECTED" })
      .where(and(eq(schema.matchRecord.id, claim.matchId), eq(schema.matchRecord.matchStatus, "PENDING_VERIFICATION")));
  }
  await notify(claim.claimantId, {
    type: "CLAIM_REJECTED",
    message: `Your claim for "${report.itemName}" was not approved. Reason: ${reason}`,
    link: `/claims/${claimId}`,
    claimId,
    email: { subject: "Update on your claim", title: "Your claim was not approved" },
  });
  await logActivity(adminId, "Rejected claim", "claim", claimId, reason);
}

export async function requestMoreProof(adminId: string, claimId: number, remarks: string) {
  const { claim, report } = await loadClaim(claimId);
  assertTransition(claim.claimStatus, "MORE_INFO_NEEDED");
  await db
    .update(schema.claim)
    .set({ claimStatus: "MORE_INFO_NEEDED", reviewedBy: adminId, dateReviewed: new Date(), remarks })
    .where(eq(schema.claim.id, claimId));
  await notify(claim.claimantId, {
    type: "CLAIM_MORE_INFO",
    message: `The office needs more proof for your claim on "${report.itemName}": ${remarks}`,
    link: `/claims/${claimId}`,
    claimId,
    email: { subject: "More proof needed for your claim", title: "Please add more proof", actionLabel: "Add proof" },
  });
  await logActivity(adminId, "Requested more proof", "claim", claimId, remarks);
}

// The owner picked the item up (FR-C6).
export async function releaseClaim(adminId: string, claimId: number) {
  const { claim, report } = await loadClaim(claimId);
  assertTransition(claim.claimStatus, "RELEASED");
  const now = new Date();
  await db
    .update(schema.claim)
    .set({ claimStatus: "RELEASED", dateReleased: now, releasedBy: adminId })
    .where(eq(schema.claim.id, claimId));
  await db.update(schema.report).set({ status: "CLAIMED" }).where(eq(schema.report.id, report.id));

  // The matched lost report is resolved too.
  if (claim.matchId) {
    const match = await db.query.matchRecord.findFirst({ where: eq(schema.matchRecord.id, claim.matchId) });
    if (match) {
      await db.update(schema.matchRecord).set({ matchStatus: "CONFIRMED" }).where(eq(schema.matchRecord.id, match.id));
      await db
        .update(schema.report)
        .set({ status: "CLOSED" })
        .where(and(eq(schema.report.id, match.lostReportId), inArray(schema.report.status, ["PENDING", "VERIFIED"])));
    }
  }
  // Other suggestions for this found item no longer apply.
  await db
    .update(schema.matchRecord)
    .set({ matchStatus: "REJECTED" })
    .where(and(eq(schema.matchRecord.foundReportId, report.id), eq(schema.matchRecord.matchStatus, "PENDING_VERIFICATION")));

  const others = await db
    .select({ id: schema.claim.id, claimantId: schema.claim.claimantId })
    .from(schema.claim)
    .where(and(eq(schema.claim.reportId, report.id), inArray(schema.claim.claimStatus, ["ON_HOLD", "PENDING", "MORE_INFO_NEEDED"])));
  if (others.length) {
    await db
      .update(schema.claim)
      .set({ claimStatus: "REJECTED", rejectionReason: "The item was released to its verified owner." })
      .where(inArray(schema.claim.id, others.map((o) => o.id)));
    for (const o of others) {
      await notify(o.claimantId, {
        type: "CLAIM_REJECTED",
        message: `"${report.itemName}" was released to its verified owner, so your claim was closed.`,
        link: `/claims/${o.id}`,
        claimId: o.id,
      });
    }
  }

  await notify(claim.claimantId, {
    type: "CLAIM_RELEASED",
    message: `You picked up "${report.itemName}". Thank you for using ReturnDesk.`,
    link: `/claims/${claimId}`,
    claimId,
  });
  await notify(report.userId, {
    type: "ITEM_RETURNED",
    message: `The "${report.itemName}" you found was returned to its owner. Thank you for turning it in!`,
    link: `/reports/${report.id}`,
    reportId: report.id,
  });
  await logActivity(adminId, "Released item to claimant", "claim", claimId, `Report #${report.id}`);
}

// Pickup deadline passed (FR-C7). Called by the daily job.
export async function lapseClaim(claimId: number) {
  const { claim, report } = await loadClaim(claimId);
  if (!canChangeClaim(claim.claimStatus, "LAPSED")) return;
  await db.update(schema.claim).set({ claimStatus: "LAPSED" }).where(eq(schema.claim.id, claimId));
  const held = await db
    .select({ id: schema.claim.id, claimantId: schema.claim.claimantId })
    .from(schema.claim)
    .where(and(eq(schema.claim.reportId, report.id), eq(schema.claim.claimStatus, "ON_HOLD")));
  if (held.length) {
    await db.update(schema.claim).set({ claimStatus: "PENDING" }).where(inArray(schema.claim.id, held.map((h) => h.id)));
    for (const h of held) {
      await notify(h.claimantId, {
        type: "CLAIM_RESUMED",
        message: `Your claim on "${report.itemName}" is back in review.`,
        link: `/claims/${h.id}`,
        claimId: h.id,
      });
    }
  }
  await notify(claim.claimantId, {
    type: "CLAIM_LAPSED",
    message: `The pickup deadline for "${report.itemName}" passed. Contact the Lost and Found Office if you still want to claim it.`,
    link: `/claims/${claimId}`,
    claimId,
    email: { subject: "Pickup deadline passed", title: "Your pickup deadline passed" },
  });
  await notifyAdmins({
    type: "CLAIM_LAPSED",
    message: `Claim #${claimId} for "${report.itemName}" lapsed: not picked up by the deadline.`,
    link: `/admin/claims/${claimId}`,
    claimId,
  });
  await logActivity(null, "Claim lapsed", "claim", claimId);
}
