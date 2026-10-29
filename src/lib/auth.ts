import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "@/db";
import { sendEmail } from "./email";
import { appUrl, env, trustedOrigins } from "./env";

export const auth = betterAuth({
  baseURL: appUrl(),
  trustedOrigins: trustedOrigins(),
  secret: env.BETTER_AUTH_SECRET,
  // Registration and profile changes go through the app's server actions,
  // which also write the student/faculty/staff record and check consent.
  // Calling these endpoints directly would skip that, and update-user would
  // let a user change their own role.
  disabledPaths: ["/sign-up/email", "/update-user"],
  database: drizzleAdapter(db, {
    provider: "mysql",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      rateLimit: schema.rateLimit,
    },
  }),
  user: {
    additionalFields: {
      idNumber: { type: "string", required: true },
      firstName: { type: "string", required: true },
      lastName: { type: "string", required: true },
      contactNo: { type: "string", required: false },
      collegeId: { type: "number", required: false },
      role: { type: "string", required: false, defaultValue: "student", input: true },
      status: { type: "string", required: false, defaultValue: "ACTIVE", input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Self-registration can only create student, faculty, or staff
        // accounts. Administrators are created by the seed or by an admin.
        before: async (data) => {
          const role = (data as { role?: string }).role ?? "student";
          if (!["student", "faculty", "staff"].includes(role)) return false;
          return { data: { ...data, role } };
        },
      },
      update: {
        // Role and account status are changed by administrators directly in
        // the database, never through the login library.
        before: async (data) => {
          const rest: Record<string, unknown> = { ...data };
          delete rest.role;
          delete rest.status;
          return { data: rest };
        },
      },
    },
    session: {
      create: {
        // Deactivated accounts cannot sign in.
        before: async (session) => {
          const found = await db.query.user.findFirst({
            columns: { status: true },
            where: (u, { eq }) => eq(u.id, session.userId),
          });
          if (found?.status === "DEACTIVATED") return false;
          return { data: session };
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        title: "Reset your password",
        paragraphs: [
          `Hi ${user.name},`,
          "We received a request to reset your ReturnDesk password. The link below expires in one hour.",
          "If you didn't ask for this, you can ignore this email.",
        ],
        action: { label: "Reset password", url },
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email",
        title: "Confirm your email address",
        paragraphs: [
          `Hi ${user.name},`,
          "Thanks for registering with ReturnDesk. Confirm your email to start reporting and claiming items.",
        ],
        action: { label: "Verify email", url },
      });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 300, max: 3 },
    },
  },
  advanced: {
    database: { generateId: () => crypto.randomUUID() },
  },
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
