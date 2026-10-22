import "server-only";
import { db, schema } from "@/db";

// Append-only audit trail (FR-C8, FR-M4).
export async function logActivity(
  userId: string | null,
  action: string,
  targetEntity: string,
  targetId: string | number,
  details?: string,
) {
  try {
    await db.insert(schema.activityLog).values({
      userId,
      action,
      targetEntity,
      targetId: String(targetId),
      details: details ?? null,
    });
  } catch (error) {
    console.error("[activity] failed to log", action, error);
  }
}
