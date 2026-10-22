import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

// The role-specific rows of a user (EERD subtypes).
export async function loadProfile(userId: string) {
  const [student, faculty, staff, administrator] = await Promise.all([
    db.query.student.findFirst({ where: eq(schema.student.userId, userId) }),
    db.query.faculty.findFirst({ where: eq(schema.faculty.userId, userId) }),
    db.query.staff.findFirst({ where: eq(schema.staff.userId, userId) }),
    db.query.administrator.findFirst({ where: eq(schema.administrator.userId, userId) }),
  ]);
  return {
    student: student ?? null,
    faculty: faculty ?? null,
    staff: staff ?? null,
    administrator: administrator ?? null,
  };
}
