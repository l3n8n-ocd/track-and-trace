import "server-only";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, schema } from "@/db";

// Failed sign-ins through the login page, per IP address and email. The login
// page signs in with a server call, which the login library's own HTTP rate
// limit doesn't cover, so the page keeps this count itself. Only failures
// count; a successful sign-in clears it.
export const LOGIN_FAILURE_LIMIT = 5;
export const LOGIN_FAILURE_WINDOW_MS = 60_000;

export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

const keyFor = (ip: string, email: string) => `login-page:${ip}:${email}`.slice(0, 255);

async function current(key: string) {
  const [row] = await db.select().from(schema.rateLimit).where(eq(schema.rateLimit.key, key));
  if (!row || Date.now() - row.lastRequest >= LOGIN_FAILURE_WINDOW_MS) return null;
  return row;
}

export async function loginBlocked(ip: string, email: string) {
  const row = await current(keyFor(ip, email));
  return (row?.count ?? 0) >= LOGIN_FAILURE_LIMIT;
}

export async function recordLoginFailure(ip: string, email: string) {
  const key = keyFor(ip, email);
  const row = await current(key);
  const now = Date.now();
  if (row) {
    await db.update(schema.rateLimit).set({ count: row.count + 1, lastRequest: now }).where(eq(schema.rateLimit.key, key));
    return;
  }
  // No count yet, or the last one expired.
  await db.delete(schema.rateLimit).where(eq(schema.rateLimit.key, key));
  await db.insert(schema.rateLimit).values({ id: randomUUID(), key, count: 1, lastRequest: now }).catch(() => {});
}

export async function clearLoginFailures(ip: string, email: string) {
  await db.delete(schema.rateLimit).where(eq(schema.rateLimit.key, keyFor(ip, email)));
}
