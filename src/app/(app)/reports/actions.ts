"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { todayPH } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { canChangeReport } from "@/lib/status";
import { logActivity } from "@/server/activity";
import { runMatchingForReport } from "@/server/matching";
import { notifyAdmins } from "@/server/notify";
import { FileValidationError, savePhoto } from "@/server/storage";

export type ReportFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const reportSchema = z.object({
  reportType: z.enum(["LOST", "FOUND"]),
  itemName: z.string().trim().min(2, "Name the item, e.g. \"black umbrella\"").max(150),
  categoryId: z.coerce.number({ message: "Choose a category" }).int().positive("Choose a category"),
  description: optional(2000),
  hiddenDetails: optional(1000),
  color: optional(50),
  brand: optional(100),
  dateLostOrFound: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date")
    .refine((d) => d <= todayPH(), "The date can't be in the future"),
  locationId: z.coerce.number({ message: "Choose a place" }).int().positive("Choose a place"),
  locationNote: optional(255),
});

function collect(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") values[k] = v;
  return values;
}

function photosFrom(formData: FormData) {
  return formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
}

function errorsOf(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0])] ??= issue.message;
  return out;
}

export async function createReportAction(_: ReportFormState, formData: FormData): Promise<ReportFormState> {
  const user = await requireUser();
  const values = collect(formData);
  const parsed = reportSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: errorsOf(parsed.error), values };
  const d = parsed.data;

  const photos = photosFrom(formData);
  if (photos.length > 5) return { fieldErrors: { photos: "Add up to 5 photos" }, values };
  if (d.reportType === "FOUND" && photos.length === 0) {
    return { fieldErrors: { photos: "Add at least one photo of the found item" }, values };
  }

  let paths: string[];
  try {
    paths = await Promise.all(photos.map(savePhoto));
  } catch (error) {
    if (error instanceof FileValidationError) return { fieldErrors: { photos: error.message }, values };
    console.error(error);
    return { error: "We couldn't upload your photos. Please try again.", values };
  }

  const [res] = await db.insert(schema.report).values({ ...d, userId: user.id });
  const reportId = res.insertId;
  if (paths.length) {
    await db.insert(schema.reportImage).values(paths.map((imagePath) => ({ reportId, imagePath })));
  }
  await logActivity(user.id, `Filed ${d.reportType.toLowerCase()} report`, "report", reportId, d.itemName);

  after(async () => {
    await notifyAdmins({
      type: "REPORT_SUBMITTED",
      message: `New ${d.reportType.toLowerCase()} report: "${d.itemName}" needs verification.`,
      link: `/admin/reports/${reportId}`,
      reportId,
    });
    await runMatchingForReport(reportId);
  });

  revalidatePath("/reports");
  redirect(`/reports/${reportId}?created=1`);
}

async function ownedReport(userId: string, reportId: number) {
  const report = await db.query.report.findFirst({
    where: and(eq(schema.report.id, reportId), eq(schema.report.userId, userId)),
  });
  return report ?? null;
}

export async function updateReportAction(
  reportId: number,
  _: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  const user = await requireUser();
  const report = await ownedReport(user.id, reportId);
  if (!report) return { error: "Report not found." };
  if (!["PENDING", "VERIFIED"].includes(report.status)) {
    return { error: "This report can no longer be edited." };
  }
  const values = collect(formData);
  const parsed = reportSchema.safeParse({ ...values, reportType: report.reportType });
  if (!parsed.success) return { fieldErrors: errorsOf(parsed.error), values };
  const d = { ...parsed.data, reportType: undefined };

  const removeIds = formData
    .getAll("removeImage")
    .map((v) => Number(v))
    .filter(Number.isInteger);
  const existing = await db.query.reportImage.findMany({ where: eq(schema.reportImage.reportId, reportId) });
  const photos = photosFrom(formData);
  const remaining = existing.filter((img) => !removeIds.includes(img.id)).length;
  if (remaining + photos.length > 5) return { fieldErrors: { photos: "A report can have up to 5 photos" }, values };
  if (report.reportType === "FOUND" && remaining + photos.length === 0) {
    return { fieldErrors: { photos: "Keep at least one photo of the found item" }, values };
  }

  let paths: string[];
  try {
    paths = await Promise.all(photos.map(savePhoto));
  } catch (error) {
    if (error instanceof FileValidationError) return { fieldErrors: { photos: error.message }, values };
    return { error: "We couldn't upload your photos. Please try again.", values };
  }

  await db.update(schema.report).set(d).where(eq(schema.report.id, reportId));
  if (removeIds.length) {
    await db
      .delete(schema.reportImage)
      .where(and(eq(schema.reportImage.reportId, reportId), inArray(schema.reportImage.id, removeIds)));
  }
  if (paths.length) {
    await db.insert(schema.reportImage).values(paths.map((imagePath) => ({ reportId, imagePath })));
  }
  await logActivity(user.id, "Edited report", "report", reportId);
  after(() => runMatchingForReport(reportId));

  revalidatePath(`/reports/${reportId}`);
  redirect(`/reports/${reportId}?updated=1`);
}

export async function withdrawReportAction(reportId: number) {
  const user = await requireUser();
  const report = await ownedReport(user.id, reportId);
  if (!report || !canChangeReport(report.status, "ARCHIVED")) redirect(`/reports/${reportId}`);
  const approved = await db.query.claim.findFirst({
    where: and(eq(schema.claim.reportId, reportId), eq(schema.claim.claimStatus, "APPROVED")),
  });
  if (approved) redirect(`/reports/${reportId}`);

  await db.update(schema.report).set({ status: "ARCHIVED" }).where(eq(schema.report.id, reportId));
  await db
    .update(schema.matchRecord)
    .set({ matchStatus: "REJECTED" })
    .where(
      and(
        eq(schema.matchRecord.matchStatus, "PENDING_VERIFICATION"),
        report.reportType === "LOST"
          ? eq(schema.matchRecord.lostReportId, reportId)
          : eq(schema.matchRecord.foundReportId, reportId),
      ),
    );
  await logActivity(user.id, "Withdrew report", "report", reportId);
  revalidatePath("/reports");
  redirect("/reports?withdrawn=1");
}
