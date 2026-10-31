"use server";

import { APIError } from "better-auth";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { auth } from "@/lib/auth";
import { appUrl } from "@/lib/env";
import { clientOrigin } from "@/lib/client-origin";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
  values?: Record<string, string>;
};

async function dashboardCallback() {
  const origin = clientOrigin((await headers()).get("origin"));
  return origin ? `${origin}/dashboard` : "/dashboard";
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

function values(formData: FormData, omit: string[] = []) {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string" && !omit.includes(k)) out[k] = v;
  }
  return out;
}

const registerSchema = z
  .object({
    role: z.enum(["student", "faculty", "staff"], { message: "Choose your role" }),
    idNumber: z.string().trim().min(3, "Enter your university ID number").max(50),
    firstName: z.string().trim().min(1, "Enter your first name").max(100),
    lastName: z.string().trim().min(1, "Enter your last name").max(100),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    contactNo: z
      .string()
      .trim()
      .max(30)
      .regex(/^[0-9+\-\s()]*$/, "Use digits only, like 09171234567")
      .optional()
      .or(z.literal("")),
    collegeId: z.coerce.number().int().positive("Choose your college or office"),
    course: z.string().trim().max(150).optional(),
    yearLevel: z.string().optional(),
    department: z.string().trim().max(150).optional(),
    academicRank: z.string().trim().max(80).optional(),
    office: z.string().trim().max(150).optional(),
    position: z.string().trim().max(100).optional(),
    password: z.string().min(8, "Use at least 8 characters").max(128),
    confirmPassword: z.string(),
    consent: z.literal("on", { message: "You must agree to the data privacy notice" }),
  })
  .superRefine((d, ctx) => {
    if (d.password !== d.confirmPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords don't match" });
    }
    const need = (key: string, label: string, value?: string) => {
      if (!value) ctx.addIssue({ code: "custom", path: [key], message: `Enter your ${label}` });
    };
    if (d.role === "student") {
      need("course", "course", d.course);
      const y = Number(d.yearLevel);
      if (!Number.isInteger(y) || y < 1 || y > 6) {
        ctx.addIssue({ code: "custom", path: ["yearLevel"], message: "Choose your year level" });
      }
    }
    if (d.role === "faculty") {
      need("department", "department", d.department);
      need("academicRank", "academic rank", d.academicRank);
    }
    if (d.role === "staff") {
      need("office", "office", d.office);
      need("position", "position", d.position);
    }
  });

export async function registerAction(_: FormState, formData: FormData): Promise<FormState> {
  const kept = values(formData, ["password", "confirmPassword"]);
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: kept };
  const d = parsed.data;

  const taken = await db.query.user.findFirst({
    columns: { id: true },
    where: eq(schema.user.idNumber, d.idNumber),
  });
  if (taken) {
    return { fieldErrors: { idNumber: "This ID number is already registered" }, values: kept };
  }
  // Checked here because the login library answers a sign-up for an existing
  // email with a made-up user instead of an error, and saving the profile
  // for that user would fail.
  const emailTaken = await db.query.user.findFirst({
    columns: { id: true },
    where: eq(schema.user.email, d.email),
  });
  if (emailTaken) {
    return {
      fieldErrors: { email: "This email is already registered. Log in, or use Forgot password if you can't." },
      values: kept,
    };
  }

  let userId: string;
  try {
    const res = await auth.api.signUpEmail({
      body: {
        email: d.email,
        password: d.password,
        name: `${d.firstName} ${d.lastName}`,
        idNumber: d.idNumber,
        firstName: d.firstName,
        lastName: d.lastName,
        contactNo: d.contactNo || undefined,
        collegeId: d.collegeId,
        role: d.role,
        callbackURL: await dashboardCallback(),
      },
      headers: await headers(),
    });
    userId = res.user.id;
  } catch (error) {
    if (error instanceof APIError) {
      const msg = error.message || "Registration failed";
      if (/exist/i.test(msg)) {
        return { fieldErrors: { email: "This email is already registered" }, values: kept };
      }
      return { error: msg, values: kept };
    }
    throw error;
  }

  if (d.role === "student") {
    await db.insert(schema.student).values({ userId, course: d.course!, yearLevel: Number(d.yearLevel) });
  } else if (d.role === "faculty") {
    await db.insert(schema.faculty).values({ userId, department: d.department!, academicRank: d.academicRank! });
  } else {
    await db.insert(schema.staff).values({ userId, office: d.office!, position: d.position! });
  }

  redirect(`/verify-email?email=${encodeURIComponent(d.email)}`);
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const kept = values(formData, ["password"]);
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: kept };
  const { email, password, next } = parsed.data;

  let role = "student";
  try {
    const res = await auth.api.signInEmail({
      body: { email, password, callbackURL: await dashboardCallback() },
      headers: await headers(),
    });
    role = (res.user as { role?: string }).role ?? "student";
  } catch (error) {
    if (error instanceof APIError) {
      if (error.status === "FORBIDDEN" && /verif/i.test(error.message)) {
        return {
          error:
            "Please verify your email first. We've sent you a new verification link; check your inbox and spam folder.",
          values: kept,
        };
      }
      if (error.status === "TOO_MANY_REQUESTS") {
        return { error: "Too many attempts. Please wait a minute and try again.", values: kept };
      }
      return { error: "Invalid email or password.", values: kept };
    }
    throw error;
  }

  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  redirect(safeNext ?? (role === "admin" ? "/admin" : "/dashboard"));
}

export async function logoutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}

export async function forgotPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!email.success) return { fieldErrors: { email: "Enter a valid email address" } };
  try {
    await auth.api.requestPasswordReset({
      body: { email: email.data, redirectTo: `${clientOrigin((await headers()).get("origin")) ?? appUrl()}/reset-password` },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError && error.status === "TOO_MANY_REQUESTS") {
      return { error: "Too many requests. Please try again in a few minutes." };
    }
  }
  // Same answer whether or not the email exists, so accounts can't be probed.
  return {
    message: "If that email is registered, a reset link is on its way. It expires in one hour.",
  };
}

const resetSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "Use at least 8 characters").max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });

export async function resetPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  try {
    await auth.api.resetPassword({
      body: { newPassword: parsed.data.password, token: parsed.data.token },
      headers: await headers(),
    });
  } catch {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }
  redirect("/login?reset=1");
}

export async function resendVerificationAction(_: FormState, formData: FormData): Promise<FormState> {
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!email.success) return { error: "Enter a valid email address" };
  try {
    await auth.api.sendVerificationEmail({
      body: { email: email.data, callbackURL: await dashboardCallback() },
      headers: await headers(),
    });
  } catch {
    // Ignore: don't reveal whether the account exists.
  }
  return { message: "If the account exists and isn't verified yet, a new link has been sent." };
}
