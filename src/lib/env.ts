import { z } from "zod";

// Server-side configuration. Optional services fall back to development
// stand-ins (local file storage, console email) when their keys are missing.
const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_SECRET: z.string().min(16).optional(),
  APP_URL: z.string().url().optional(),
  CLIENT_APP_URL: z.string().url().optional(),
  VERCEL_URL: z.string().optional(),
  VERCEL_BRANCH_URL: z.string().optional(),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  SMTP_USER: z.string().trim().optional(),
  // Gmail shows App Passwords in groups of four ("abcd efgh ijkl mnop");
  // the spaces aren't part of the password.
  SMTP_PASSWORD: z
    .string()
    .transform((v) => v.replace(/\s+/g, ""))
    .optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export const env = schema.parse(process.env);

// The public address of the site. On Vercel this falls back to the
// production domain, so links in emails work even before APP_URL is set.
export function appUrl(): string {
  if (env.APP_URL) return env.APP_URL.replace(/\/$/, "");
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return "http://localhost:3000";
}

// Every address the site can be reached at (production, preview, branch).
export function trustedOrigins(): string[] {
  return [
    appUrl(),
    ...[env.VERCEL_PROJECT_PRODUCTION_URL, env.VERCEL_URL, env.VERCEL_BRANCH_URL]
      .filter((h): h is string => Boolean(h))
      .map((h) => `https://${h}`),
  ];
}

export const cloudinaryEnabled = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
);
export const smtpEnabled = Boolean(env.SMTP_USER && env.SMTP_PASSWORD);
