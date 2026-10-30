"use server";

import { hashPassword } from "better-auth/crypto";
import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/session";
import { canChangeReport } from "@/lib/status";
import { logActivity } from "@/server/activity";
import { ClaimError, approveClaim, rejectClaim, releaseClaim, requestMoreProof } from "@/server/claims";
import { runMatchingForReport } from "@/server/matching";
import { notify } from "@/server/notify";

// Admin actions redirect back to the page with ?msg= or ?error=, which the
// page shows as an alert.
function back(path: string, result: { msg?: string; error?: string }): never {
  const [base, query] = path.split("?");
  const params = new URLSearchParams(query);
  for (const [k, v] of Object.entries(result)) if (v) params.set(k, v);
  revalidatePath(base);
  redirect(`${base}?${params}`);
}

// Settings forms post the tab they're on, so the page reopens there.
function settingsPath(formData?: FormData) {
  const tab = formData ? String(formData.get("tab") ?? "") : "";
  return /^[a-z]+$/.test(tab) ? `/admin/settings?tab=${tab}` : "/admin/settings";
}

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const num = (formData: FormData, key: string) => Number(formData.get(key)) || 0;

// ---------------------------------------------------------------------------
// Reports (FR-R6, FR-M2)
// ---------------------------------------------------------------------------

export async function verifyReportAction(reportId: number, formData: FormData) {
  const admin = await requireAdmin();
  const path = `/admin/reports/${reportId}`;
  const report = await db.query.report.findFirst({ where: eq(schema.report.id, reportId) });
  if (!report || !canChangeReport(report.status, "VERIFIED")) back(path, { error: "This report can't be verified." });
  const storageLocationId = num(formData, "storageLocationId") || null;
  if (report.reportType === "FOUND" && !storageLocationId) {
    back(path, { error: "Choose where the item is stored before verifying." });
  }
  await db
    .update(schema.report)
    .set({ status: "VERIFIED", verifiedBy: admin.id, dateVerified: new Date(), storageLocationId })
    .where(eq(schema.report.id, reportId));
  await logActivity(admin.id, "Verified report", "report", reportId);
  await notify(report.userId, {
    type: "REPORT_VERIFIED",
    message:
      report.reportType === "FOUND"
        ? `The Lost and Found Office received the "${report.itemName}" you found. Thank you!`
        : `Your lost report for "${report.itemName}" was verified. We'll alert you about matches.`,
    link: `/reports/${reportId}`,
    reportId,
  });
  after(() => runMatchingForReport(reportId));
  back(path, { msg: "Report verified." });
}

export async function assignStorageAction(reportId: number, formData: FormData) {
  const admin = await requireAdmin();
  const path = `/admin/reports/${reportId}`;
  const storageLocationId = num(formData, "storageLocationId");
  if (!storageLocationId) back(path, { error: "Choose a storage location." });
  await db.update(schema.report).set({ storageLocationId }).where(eq(schema.report.id, reportId));
  await logActivity(admin.id, "Assigned storage location", "report", reportId, String(storageLocationId));
  back(path, { msg: "Storage location saved." });
}

export async function setReportStatusAction(reportId: number, formData: FormData) {
  const admin = await requireAdmin();
  const path = `/admin/reports/${reportId}`;
  const to = z.enum(["ARCHIVED", "CLOSED", "EXPIRED", "VERIFIED"]).safeParse(formData.get("status"));
  const report = await db.query.report.findFirst({ where: eq(schema.report.id, reportId) });
  if (!to.success || !report || !canChangeReport(report.status, to.data)) {
    back(path, { error: "That status change isn't allowed." });
  }
  if (to.data === "ARCHIVED" || to.data === "EXPIRED") {
    const approved = await db.query.claim.findFirst({
      where: and(eq(schema.claim.reportId, reportId), eq(schema.claim.claimStatus, "APPROVED")),
    });
    if (approved) back(path, { error: `Claim #${approved.id} is approved; release or lapse it first.` });
  }
  await db.update(schema.report).set({ status: to.data }).where(eq(schema.report.id, reportId));
  const note = text(formData, "note");
  await logActivity(admin.id, `Set report status to ${to.data}`, "report", reportId, note || undefined);
  back(path, { msg: `Report marked ${to.data.toLowerCase()}.` });
}

// ---------------------------------------------------------------------------
// Claims (FR-C3 to FR-C6)
// ---------------------------------------------------------------------------

async function claimDecision(claimId: number, run: () => Promise<void>, msg: string) {
  const path = `/admin/claims/${claimId}`;
  try {
    await run();
  } catch (error) {
    if (error instanceof ClaimError) back(path, { error: error.message });
    throw error;
  }
  back(path, { msg });
}

export async function approveClaimAction(claimId: number, formData: FormData) {
  const admin = await requireAdmin();
  const deadline = text(formData, "pickupDeadline");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) back(`/admin/claims/${claimId}`, { error: "Set a pickup deadline." });
  // End of the chosen day, Philippine time.
  const pickupDeadline = new Date(`${deadline}T23:59:59+08:00`);
  if (pickupDeadline.getTime() < Date.now()) back(`/admin/claims/${claimId}`, { error: "The deadline must be in the future." });
  await claimDecision(
    claimId,
    () => approveClaim(admin.id, claimId, pickupDeadline, text(formData, "remarks") || null),
    "Claim approved. The claimant was notified with pickup details.",
  );
}

export async function rejectClaimAction(claimId: number, formData: FormData) {
  const admin = await requireAdmin();
  const reason = text(formData, "reason");
  if (reason.length < 5) back(`/admin/claims/${claimId}`, { error: "Give the claimant a reason for the rejection." });
  await claimDecision(claimId, () => rejectClaim(admin.id, claimId, reason), "Claim rejected.");
}

export async function requestProofAction(claimId: number, formData: FormData) {
  const admin = await requireAdmin();
  const remarks = text(formData, "remarks");
  if (remarks.length < 5) back(`/admin/claims/${claimId}`, { error: "Tell the claimant what proof you need." });
  await claimDecision(claimId, () => requestMoreProof(admin.id, claimId, remarks), "More proof requested.");
}

export async function releaseClaimAction(claimId: number) {
  const admin = await requireAdmin();
  await claimDecision(claimId, () => releaseClaim(admin.id, claimId), "Item released and records updated.");
}

// ---------------------------------------------------------------------------
// Users (FR-A7)
// ---------------------------------------------------------------------------

export async function setUserStatusAction(userId: string, formData: FormData) {
  const admin = await requireAdmin();
  const path = `/admin/users/${userId}`;
  const status = formData.get("status") === "ACTIVE" ? "ACTIVE" : "DEACTIVATED";
  if (userId === admin.id) back(path, { error: "You can't change your own account status." });
  await db.update(schema.user).set({ status }).where(eq(schema.user.id, userId));
  if (status === "DEACTIVATED") await db.delete(schema.session).where(eq(schema.session.userId, userId));
  await logActivity(admin.id, status === "ACTIVE" ? "Reactivated user" : "Deactivated user", "user", userId);
  back(path, { msg: status === "ACTIVE" ? "Account reactivated." : "Account deactivated and signed out." });
}

const newAdminSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email(),
  idNumber: z.string().trim().min(3).max(50),
  office: z.string().trim().min(2).max(150),
  password: z.string().min(8).max(128),
});

export async function createAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = newAdminSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back("/admin/users/new", { error: "Fill in every field. Passwords need at least 8 characters." });
  const d = parsed.data;
  const clash = await db.query.user.findFirst({
    where: (u, { or, eq: e }) => or(e(u.email, d.email), e(u.idNumber, d.idNumber)),
  });
  if (clash) back("/admin/users/new", { error: "That email or ID number is already registered." });

  const id = randomUUID();
  await db.insert(schema.user).values({
    id,
    name: `${d.firstName} ${d.lastName}`,
    email: d.email,
    emailVerified: true,
    idNumber: d.idNumber,
    firstName: d.firstName,
    lastName: d.lastName,
    role: "admin",
  });
  await db.insert(schema.account).values({
    id: randomUUID(),
    accountId: id,
    providerId: "credential",
    userId: id,
    password: await hashPassword(d.password),
  });
  await db.insert(schema.administrator).values({ userId: id, office: d.office, adminLevel: "ADMIN" });
  await logActivity(admin.id, "Created administrator account", "user", id, d.email);
  back(`/admin/users/${id}`, { msg: "Administrator account created. Share the temporary password privately." });
}

// ---------------------------------------------------------------------------
// Settings: categories, places, storage, colleges (FR-M3)
// ---------------------------------------------------------------------------

export async function addCategoryAction(formData: FormData) {
  const admin = await requireAdmin();
  const name = text(formData, "name");
  const parentId = num(formData, "parentId") || null;
  if (name.length < 2) back(settingsPath(formData), { error: "Enter a category name." });
  const [res] = await db.insert(schema.category).values({ name, parentId });
  await logActivity(admin.id, "Added category", "category", res.insertId, name);
  back(settingsPath(formData), { msg: `Category "${name}" added.` });
}

export async function renameCategoryAction(categoryId: number, formData: FormData) {
  const admin = await requireAdmin();
  const name = text(formData, "name");
  if (name.length < 2) back(settingsPath(formData), { error: "Enter a category name." });
  await db.update(schema.category).set({ name }).where(eq(schema.category.id, categoryId));
  await logActivity(admin.id, "Renamed category", "category", categoryId, name);
  back(settingsPath(formData), { msg: "Category renamed." });
}

export async function deleteCategoryAction(categoryId: number, formData?: FormData) {
  const admin = await requireAdmin();
  const [[used], [children]] = await Promise.all([
    db.select({ value: count() }).from(schema.report).where(eq(schema.report.categoryId, categoryId)),
    db.select({ value: count() }).from(schema.category).where(eq(schema.category.parentId, categoryId)),
  ]);
  if (used.value || children.value) {
    back(settingsPath(formData), { error: "This category has reports or subcategories, so it can't be deleted." });
  }
  await db.delete(schema.category).where(eq(schema.category.id, categoryId));
  await logActivity(admin.id, "Deleted category", "category", categoryId);
  back(settingsPath(formData), { msg: "Category deleted." });
}

export async function addLocationAction(formData: FormData) {
  const admin = await requireAdmin();
  const isStorage = formData.get("isStorage") === "1";
  const buildingName = text(formData, "buildingName");
  if (buildingName.length < 2) back(settingsPath(formData), { error: "Enter a building or place name." });
  const [res] = await db.insert(schema.location).values({
    buildingName,
    areaDescription: text(formData, "areaDescription") || null,
    roomNumber: text(formData, "roomNumber") || null,
    storageBin: text(formData, "storageBin") || null,
    isStorage,
  });
  await logActivity(admin.id, isStorage ? "Added storage location" : "Added place", "location", res.insertId, buildingName);
  back(settingsPath(formData), { msg: isStorage ? "Storage location added." : "Place added." });
}

export async function toggleLocationAction(locationId: number, formData?: FormData) {
  const admin = await requireAdmin();
  const loc = await db.query.location.findFirst({ where: eq(schema.location.id, locationId) });
  if (!loc) back(settingsPath(formData), { error: "Location not found." });
  await db.update(schema.location).set({ isActive: !loc.isActive }).where(eq(schema.location.id, locationId));
  await logActivity(admin.id, loc.isActive ? "Hid location" : "Restored location", "location", locationId);
  back(settingsPath(formData), { msg: loc.isActive ? "Location hidden from forms." : "Location restored." });
}

export async function addCollegeAction(formData: FormData) {
  const admin = await requireAdmin();
  const name = text(formData, "name");
  if (name.length < 3) back(settingsPath(formData), { error: "Enter a college or office name." });
  const exists = await db.query.college.findFirst({ where: eq(schema.college.name, name) });
  if (exists) back(settingsPath(formData), { error: "That college already exists." });
  const [res] = await db.insert(schema.college).values({ name });
  await logActivity(admin.id, "Added college", "college", res.insertId, name);
  back(settingsPath(formData), { msg: "College added." });
}

// ---------------------------------------------------------------------------
// Announcements (FR-N3)
// ---------------------------------------------------------------------------

export async function createAnnouncementAction(formData: FormData) {
  const admin = await requireAdmin();
  const title = text(formData, "title");
  const body = text(formData, "body");
  if (title.length < 3 || body.length < 5) back("/admin/announcements", { error: "Enter a title and a message." });
  const [res] = await db.insert(schema.announcement).values({ adminId: admin.id, title, body });
  await logActivity(admin.id, "Posted announcement", "announcement", res.insertId, title);
  back("/admin/announcements", { msg: "Announcement posted. Users see it on their dashboard." });
}

export async function toggleAnnouncementAction(id: number) {
  const admin = await requireAdmin();
  const a = await db.query.announcement.findFirst({ where: eq(schema.announcement.id, id) });
  if (!a) back("/admin/announcements", { error: "Announcement not found." });
  await db.update(schema.announcement).set({ isActive: !a.isActive }).where(eq(schema.announcement.id, id));
  await logActivity(admin.id, a.isActive ? "Hid announcement" : "Showed announcement", "announcement", id);
  back("/admin/announcements", { msg: a.isActive ? "Announcement hidden." : "Announcement shown again." });
}

export async function deleteAnnouncementAction(id: number) {
  const admin = await requireAdmin();
  await db.delete(schema.announcement).where(eq(schema.announcement.id, id));
  await logActivity(admin.id, "Deleted announcement", "announcement", id);
  back("/admin/announcements", { msg: "Announcement deleted." });
}
