import { z } from "zod";
import { ROLES, type Role } from "@/db/schema";

export const userProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(100),
  lastName: z.string().trim().min(1, "Last name is required.").max(100),
  displayName: z.string().trim().min(1, "Display name is required.").max(255),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(255),
  idNumber: z.string().trim().min(3, "Enter an ID number of at least 3 characters.").max(50),
  contactNo: z.string().trim().max(30).regex(/^[0-9+\-\s()]*$/, "Enter a valid contact number."),
});

export const roleChangeSchema = z.object({ role: z.enum(ROLES) });
export const accountStatusSchema = z.enum(["ACTIVE", "DEACTIVATED"]);
const required = (label: string, max: number) => z.string().trim().min(1, `${label} is required.`).max(max);
export const roleDetailsSchema = {
  student: z.object({ course: required("Course", 150), yearLevel: z.coerce.number().int().min(1).max(6) }),
  faculty: z.object({ department: required("Department", 150), academicRank: required("Academic rank", 80) }),
  staff: z.object({ office: required("Office", 150), position: required("Position", 100) }),
  admin: z.object({ office: required("Office", 150) }),
};

export function parseUserCollege(value: FormDataEntryValue | null, role: Role) {
  if (role === "admin" && (value === null || value === "")) return null;
  return z.coerce.number().int().positive("Choose a college or office.").parse(value);
}

export function assertAccessChange(actorId: string, targetId: string) {
  if (actorId === targetId) throw new Error("You can't change your own access. Ask another administrator.");
}
