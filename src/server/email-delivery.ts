import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export const VERIFICATION_EMAIL_INTERVAL_MS = 60_000;

// Reserve a send in the shared database, not process memory: login, resend,
// signup, and separate serverless instances must share the same cooldown.
export async function reserveVerificationEmail(email: string, now = Date.now()) {
  const address = email.trim().toLowerCase();
  const key = `verification-email:${createHash("sha256").update(address).digest("hex")}`;
  return db.transaction(async tx => {
    await tx.insert(schema.rateLimit).values({ id: randomUUID(), key, count: 0, lastRequest: 0 })
      .onDuplicateKeyUpdate({ set: { key } });
    const [entry] = await tx.select({ lastRequest: schema.rateLimit.lastRequest }).from(schema.rateLimit)
      .where(eq(schema.rateLimit.key, key)).for("update");
    if (!entry || entry.lastRequest > now - VERIFICATION_EMAIL_INTERVAL_MS) return false;
    await tx.update(schema.rateLimit).set({ count: 1, lastRequest: now }).where(eq(schema.rateLimit.key, key));
    return true;
  });
}
