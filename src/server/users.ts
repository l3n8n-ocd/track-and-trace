import "server-only";
import { and, asc, eq, ne, or } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import type { Role } from "@/db/schema";
import { accountStatusSchema, assertAccessChange, parseUserCollege, roleChangeSchema, roleDetailsSchema, userProfileSchema } from "@/lib/user-management";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export class UserManagementError extends Error {}

async function lockUser(tx: Tx, actorId: string, targetId: string) {
  // Serialize administrator access changes. A stale request cannot remove
  // the last admin or continue after its acting admin has lost access.
  const admins = await tx.select({ id: schema.user.id, status: schema.user.status }).from(schema.user)
    .where(eq(schema.user.role, "admin")).orderBy(asc(schema.user.id)).for("update");
  if (!admins.some((u) => u.id === actorId && u.status === "ACTIVE")) throw new UserManagementError("Administrator access is required.");
  const [target] = await tx.select().from(schema.user).where(eq(schema.user.id, targetId)).for("update");
  if (!target) throw new UserManagementError("User not found.");
  return target;
}

async function audit(tx: Tx, actorId: string, userId: string, action: string, details?: string) {
  await tx.insert(schema.activityLog).values({ userId: actorId, targetEntity: "user", targetId: userId, action, details: details ?? null });
}

async function saveRoleDetails(tx: Tx, userId: string, role: Role, form: FormData) {
  const input = Object.fromEntries(form);
  // Parse the chosen subtype before writing anything; all changes roll back
  // together if a field, college, unique ID, or email is invalid.
  if (role === "student") {
    const data = roleDetailsSchema.student.parse(input);
    await tx.insert(schema.student).values({ userId, ...data }).onDuplicateKeyUpdate({ set: data });
  } else if (role === "faculty") {
    const data = roleDetailsSchema.faculty.parse(input);
    await tx.insert(schema.faculty).values({ userId, ...data }).onDuplicateKeyUpdate({ set: data });
  } else if (role === "staff") {
    const data = roleDetailsSchema.staff.parse(input);
    await tx.insert(schema.staff).values({ userId, ...data }).onDuplicateKeyUpdate({ set: data });
  } else {
    const data = roleDetailsSchema.admin.parse(input);
    // Existing SUPER_ADMIN designation is preserved, never supplied by a form.
    await tx.insert(schema.administrator).values({ userId, ...data, adminLevel: "ADMIN" }).onDuplicateKeyUpdate({ set: data });
  }
  for (const [subtype, table] of Object.entries({ student: schema.student, faculty: schema.faculty, staff: schema.staff, admin: schema.administrator })) {
    if (subtype !== role) await tx.delete(table).where(eq(table.userId, userId));
  }
}

async function collegeExists(tx: Tx, collegeId: number | null) {
  if (collegeId === null) return;
  const [college] = await tx.select({ id: schema.college.id }).from(schema.college).where(eq(schema.college.id, collegeId));
  if (!college) throw new UserManagementError("Choose an existing college or office.");
}

export function userManagementMessage(error: unknown): string | null {
  if (error instanceof UserManagementError) return error.message;
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? "Check the user details.";
  const cause = error as { code?: string; cause?: { code?: string } };
  if (cause?.code === "ER_DUP_ENTRY" || cause?.cause?.code === "ER_DUP_ENTRY") return "That email or ID number is already registered.";
  return null;
}

export async function editUserProfile(actorId: string, userId: string, form: FormData) {
  const data = userProfileSchema.parse(Object.fromEntries(form));
  return db.transaction(async (tx) => {
    const target = await lockUser(tx, actorId, userId);
    const collegeId = parseUserCollege(form.get("collegeId"), target.role);
    await collegeExists(tx, collegeId);
    const emailChanged = data.email !== target.email.toLowerCase();
    if (emailChanged && actorId === userId) throw new UserManagementError("Ask another administrator to change your sign-in email.");
    const [clash] = await tx.select({ id: schema.user.id }).from(schema.user).where(and(ne(schema.user.id, userId), or(eq(schema.user.email, data.email), eq(schema.user.idNumber, data.idNumber))));
    if (clash) throw new UserManagementError("That email or ID number is already registered.");
    await saveRoleDetails(tx, userId, target.role, form);
    const { displayName, ...fields } = data;
    await tx.update(schema.user).set({ ...fields, name: displayName, contactNo: data.contactNo || null, collegeId,
      ...(emailChanged ? { emailVerified: false } : {}) }).where(eq(schema.user.id, userId));
    if (emailChanged) await tx.delete(schema.session).where(eq(schema.session.userId, userId));
    await audit(tx, actorId, userId, "Updated user information", emailChanged ? "Email changed; verification required and sessions revoked." : "Profile and role details updated.");
    return { emailChanged, email: data.email };
  });
}

export async function changeUserRole(actorId: string, userId: string, form: FormData) {
  const { role } = roleChangeSchema.parse(Object.fromEntries(form));
  if (actorId === userId) throw new UserManagementError("You can't change your own access. Ask another administrator.");
  return db.transaction(async (tx) => {
    const target = await lockUser(tx, actorId, userId);
    const collegeId = parseUserCollege(form.get("collegeId"), role);
    await collegeExists(tx, collegeId);
    await saveRoleDetails(tx, userId, role, form);
    await tx.update(schema.user).set({ role, collegeId }).where(eq(schema.user.id, userId));
    await tx.delete(schema.session).where(eq(schema.session.userId, userId));
    await audit(tx, actorId, userId, "Changed user access", `${target.role} → ${role}; sessions revoked. Account status unchanged.`);
  });
}

export async function changeUserStatus(actorId: string, userId: string, value: unknown) {
  const status = accountStatusSchema.parse(value);
  try { assertAccessChange(actorId, userId); } catch (error) { throw new UserManagementError((error as Error).message); }
  await db.transaction(async (tx) => {
    await lockUser(tx, actorId, userId);
    await tx.update(schema.user).set({ status }).where(eq(schema.user.id, userId));
    if (status === "DEACTIVATED") await tx.delete(schema.session).where(eq(schema.session.userId, userId));
    await audit(tx, actorId, userId, status === "ACTIVE" ? "Reactivated user" : "Deactivated user");
  });
  return status;
}

export async function revokeUserSessions(actorId: string, userId: string) {
  try { assertAccessChange(actorId, userId); } catch (error) { throw new UserManagementError((error as Error).message); }
  await db.transaction(async (tx) => {
    await lockUser(tx, actorId, userId);
    await tx.delete(schema.session).where(eq(schema.session.userId, userId));
    await audit(tx, actorId, userId, "Revoked user sessions");
  });
}
