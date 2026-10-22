"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { PROOF_TYPES, type ProofType } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { ACTIVE_CLAIM_STATUSES } from "@/lib/status";
import { logActivity } from "@/server/activity";
import { notifyAdmins } from "@/server/notify";
import { FileValidationError, saveProof } from "@/server/storage";

export type ClaimFormState = { error?: string; fieldErrors?: Record<string, string>; values?: Record<string, string> };

const MAX_FILES = 3;

const proofSchema = z.object({
  statement: z
    .string()
    .trim()
    .min(20, "Describe the item in at least a few sentences (20+ characters)")
    .max(3000),
  fileType: z.enum(PROOF_TYPES).default("PHOTO"),
});

async function storeProofs(claimId: number, statement: string, fileType: ProofType, files: File[]) {
  const paths = await Promise.all(files.map(saveProof));
  await db.insert(schema.claimProof).values([
    { claimId, proofType: "DESCRIPTION", description: statement },
    ...paths.map((filePath, i) => ({
      claimId,
      proofType: files[i].type === "application/pdf" && fileType === "PHOTO" ? ("DOCUMENT" as const) : fileType,
      filePath,
    })),
  ]);
}

function filesFrom(formData: FormData) {
  return formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
}

export async function createClaimAction(
  reportId: number,
  _: ClaimFormState,
  formData: FormData,
): Promise<ClaimFormState> {
  const user = await requireUser();
  const values = { statement: String(formData.get("statement") ?? ""), fileType: String(formData.get("fileType") ?? "") };
  const parsed = proofSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { fieldErrors, values };
  }
  const files = filesFrom(formData);
  if (files.length > MAX_FILES) return { fieldErrors: { files: `Attach up to ${MAX_FILES} files` }, values };

  const report = await db.query.report.findFirst({ where: eq(schema.report.id, reportId) });
  if (!report || report.reportType !== "FOUND" || report.status !== "VERIFIED") {
    return { error: "This item can't be claimed right now." };
  }
  if (report.userId === user.id) return { error: "You can't claim an item you reported found." };

  const existing = await db.query.claim.findFirst({
    where: and(
      eq(schema.claim.reportId, reportId),
      eq(schema.claim.claimantId, user.id),
      inArray(schema.claim.claimStatus, ACTIVE_CLAIM_STATUSES),
    ),
  });
  if (existing) redirect(`/claims/${existing.id}`);

  // Link the claim to the user's match for this item, if there is one.
  let matchId: number | null = null;
  const requestedMatch = Number(formData.get("matchId")) || null;
  if (requestedMatch) {
    const [match] = await db
      .select({ id: schema.matchRecord.id, ownerId: schema.report.userId })
      .from(schema.matchRecord)
      .innerJoin(schema.report, eq(schema.report.id, schema.matchRecord.lostReportId))
      .where(and(eq(schema.matchRecord.id, requestedMatch), eq(schema.matchRecord.foundReportId, reportId)));
    if (match && match.ownerId === user.id) matchId = match.id;
  }

  // If another claim on this item is already approved, wait in line.
  const approved = await db.query.claim.findFirst({
    where: and(eq(schema.claim.reportId, reportId), eq(schema.claim.claimStatus, "APPROVED")),
  });

  const [res] = await db.insert(schema.claim).values({
    reportId,
    claimantId: user.id,
    matchId,
    claimStatus: approved ? "ON_HOLD" : "PENDING",
  });
  const claimId = res.insertId;
  try {
    await storeProofs(claimId, parsed.data.statement, parsed.data.fileType, files);
  } catch (error) {
    await db.delete(schema.claim).where(eq(schema.claim.id, claimId));
    if (error instanceof FileValidationError) return { fieldErrors: { files: error.message }, values };
    console.error(error);
    return { error: "We couldn't upload your files. Please try again.", values };
  }
  await logActivity(user.id, "Filed claim", "claim", claimId, `Report #${reportId}`);
  after(() =>
    notifyAdmins({
      type: "CLAIM_SUBMITTED",
      message: `New claim on found item "${report.itemName}" (report #${reportId}) needs review.`,
      link: `/admin/claims/${claimId}`,
      claimId,
      reportId,
      email: { subject: "New claim to review", title: "A claim is waiting for review", actionLabel: "Review claim" },
    }),
  );
  revalidatePath("/claims");
  redirect(`/claims/${claimId}?created=1`);
}

export async function addProofAction(claimId: number, _: ClaimFormState, formData: FormData): Promise<ClaimFormState> {
  const user = await requireUser();
  const values = { statement: String(formData.get("statement") ?? ""), fileType: String(formData.get("fileType") ?? "") };
  const parsed = proofSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { fieldErrors, values };
  }
  const files = filesFrom(formData);
  if (files.length > MAX_FILES) return { fieldErrors: { files: `Attach up to ${MAX_FILES} files` }, values };

  const claim = await db.query.claim.findFirst({
    where: and(eq(schema.claim.id, claimId), eq(schema.claim.claimantId, user.id)),
  });
  if (!claim || claim.claimStatus !== "MORE_INFO_NEEDED") return { error: "This claim isn't waiting for more proof." };

  try {
    await storeProofs(claimId, parsed.data.statement, parsed.data.fileType, files);
  } catch (error) {
    if (error instanceof FileValidationError) return { fieldErrors: { files: error.message }, values };
    return { error: "We couldn't upload your files. Please try again.", values };
  }
  await db.update(schema.claim).set({ claimStatus: "PENDING" }).where(eq(schema.claim.id, claimId));
  await logActivity(user.id, "Added proof to claim", "claim", claimId);
  after(() =>
    notifyAdmins({
      type: "CLAIM_PROOF_ADDED",
      message: `The claimant added more proof to claim #${claimId}.`,
      link: `/admin/claims/${claimId}`,
      claimId,
    }),
  );
  revalidatePath(`/claims/${claimId}`);
  redirect(`/claims/${claimId}?proofAdded=1`);
}
