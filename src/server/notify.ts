import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { sendEmail } from "@/lib/email";

type Notice = {
  type: string;
  message: string;
  link?: string;
  reportId?: number | null;
  claimId?: number | null;
  // When set, an email copy is sent too (FR-N2).
  email?: { subject: string; title: string; paragraphs?: string[]; actionLabel?: string };
};

export async function notify(userIds: string | string[], notice: Notice) {
  const ids = [...new Set(Array.isArray(userIds) ? userIds : [userIds])];
  if (!ids.length) return;
  await db.insert(schema.notification).values(
    ids.map((userId) => ({
      userId,
      notificationType: notice.type,
      message: notice.message,
      link: notice.link ?? null,
      reportId: notice.reportId ?? null,
      claimId: notice.claimId ?? null,
    })),
  );
  if (notice.email) {
    const recipients = await db
      .select({ email: schema.user.email, name: schema.user.firstName })
      .from(schema.user)
      .where(inArray(schema.user.id, ids));
    await Promise.all(
      recipients.map((r) =>
        sendEmail({
          to: r.email,
          subject: notice.email!.subject,
          title: notice.email!.title,
          paragraphs: [`Hi ${r.name},`, notice.message, ...(notice.email!.paragraphs ?? [])],
          action: notice.link
            ? { label: notice.email!.actionLabel ?? "Open ReturnDesk", url: notice.link }
            : undefined,
        }),
      ),
    );
  }
}

export async function adminIds(): Promise<string[]> {
  const rows = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.role, "admin"));
  return rows.map((r) => r.id);
}

export async function notifyAdmins(notice: Notice) {
  await notify(await adminIds(), notice);
}
