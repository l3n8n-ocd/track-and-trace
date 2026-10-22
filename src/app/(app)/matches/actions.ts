"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/server/activity";

// "Not my item" (FR-S6). Only the owner of the lost report can dismiss.
export async function dismissMatchAction(matchId: number) {
  const user = await requireUser();
  const [match] = await db
    .select({ status: schema.matchRecord.matchStatus, ownerId: schema.report.userId })
    .from(schema.matchRecord)
    .innerJoin(schema.report, eq(schema.report.id, schema.matchRecord.lostReportId))
    .where(eq(schema.matchRecord.id, matchId));
  if (!match || match.ownerId !== user.id || match.status !== "PENDING_VERIFICATION") return;
  await db
    .update(schema.matchRecord)
    .set({ matchStatus: "REJECTED" })
    .where(and(eq(schema.matchRecord.id, matchId), eq(schema.matchRecord.matchStatus, "PENDING_VERIFICATION")));
  await logActivity(user.id, "Dismissed match", "match_record", matchId);
  revalidatePath("/matches");
}
