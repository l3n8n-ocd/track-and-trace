"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/session";

export async function openNotificationAction(id: number) {
  const user = await requireUser();
  const n = await db.query.notification.findFirst({
    where: and(eq(schema.notification.id, id), eq(schema.notification.userId, user.id)),
  });
  if (!n) return;
  await db.update(schema.notification).set({ isRead: true }).where(eq(schema.notification.id, id));
  revalidatePath("/", "layout");
  if (n.link?.startsWith("/")) redirect(n.link);
}

export async function markAllReadAction() {
  const user = await requireUser();
  await db
    .update(schema.notification)
    .set({ isRead: true })
    .where(and(eq(schema.notification.userId, user.id), eq(schema.notification.isRead, false)));
  revalidatePath("/", "layout");
}
