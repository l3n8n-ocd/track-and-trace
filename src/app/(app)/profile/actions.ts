"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/server/activity";

export type ProfileState = { error?: string; message?: string; fieldErrors?: Record<string, string> };

function errorsOf(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of error.issues) out[String(i.path[0])] ??= i.message;
  return out;
}

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "Required").max(100),
  lastName: z.string().trim().min(1, "Required").max(100),
  contactNo: z.string().trim().max(30).regex(/^[0-9+\-\s()]*$/, "Digits only"),
  collegeId: z.coerce.number().int().positive("Choose your college or office"),
  course: z.string().trim().max(150).optional(),
  yearLevel: z.coerce.number().int().min(1).max(6).optional(),
  department: z.string().trim().max(150).optional(),
  academicRank: z.string().trim().max(80).optional(),
  office: z.string().trim().max(150).optional(),
  position: z.string().trim().max(100).optional(),
});

export async function updateProfileAction(_: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: errorsOf(parsed.error) };
  const d = parsed.data;
  await db
    .update(schema.user)
    .set({
      firstName: d.firstName,
      lastName: d.lastName,
      name: `${d.firstName} ${d.lastName}`,
      contactNo: d.contactNo || null,
      collegeId: d.collegeId,
    })
    .where(eq(schema.user.id, user.id));

  if (user.role === "student" && d.course && d.yearLevel) {
    await db
      .insert(schema.student)
      .values({ userId: user.id, course: d.course, yearLevel: d.yearLevel })
      .onDuplicateKeyUpdate({ set: { course: d.course, yearLevel: d.yearLevel } });
  } else if (user.role === "faculty" && d.department && d.academicRank) {
    await db
      .insert(schema.faculty)
      .values({ userId: user.id, department: d.department, academicRank: d.academicRank })
      .onDuplicateKeyUpdate({ set: { department: d.department, academicRank: d.academicRank } });
  } else if (user.role === "staff" && d.office && d.position) {
    await db
      .insert(schema.staff)
      .values({ userId: user.id, office: d.office, position: d.position })
      .onDuplicateKeyUpdate({ set: { office: d.office, position: d.position } });
  }
  revalidatePath("/", "layout");
  return { message: "Profile saved." };
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "Use at least 8 characters").max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match" });

export async function changePasswordAction(_: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: errorsOf(parsed.error) };
  try {
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
  } catch {
    return { fieldErrors: { currentPassword: "Your current password is incorrect" } };
  }
  await logActivity(user.id, "Changed password", "user", user.id);
  return { message: "Password changed. Other devices were signed out." };
}

export async function deactivateAccountAction(_: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  if (formData.get("confirm") !== "DEACTIVATE") return { error: 'Type "DEACTIVATE" to confirm.' };
  if (user.role === "admin") return { error: "Administrator accounts can only be deactivated by another administrator." };
  await db.update(schema.user).set({ status: "DEACTIVATED" }).where(eq(schema.user.id, user.id));
  await db.delete(schema.session).where(eq(schema.session.userId, user.id));
  await logActivity(user.id, "Deactivated own account", "user", user.id);
  redirect("/login");
}
